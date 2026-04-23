"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";
import { supabase } from "@/utils/supabase/client";

type FormState = {
  playerCode: string;
  fullName: string;
  phone: string;
  email: string;
  cityBase: string;
  role: string;
  currentTeam: string;
  battingStyle: string;
  bowlingStyle: string;
  preferredTournament: string;
  notes: string;
};

const initialFormState: FormState = {
  playerCode: "",
  fullName: "",
  phone: "",
  email: "",
  cityBase: "",
  role: "",
  currentTeam: "",
  battingStyle: "",
  bowlingStyle: "",
  preferredTournament: "",
  notes: "",
};

function getPlayerIdFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function isImageFile(file: File | null) {
  if (!file) return false;
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type);
}

export default function PlayerRegistrationPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingCode, setFetchingCode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [generatedPlayerCode, setGeneratedPlayerCode] = useState("");
  const [editingId, setEditingId] = useState("");
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const [existingPhotoPath, setExistingPhotoPath] = useState("");

  const [prefillSquadMemberId, setPrefillSquadMemberId] = useState("");
  const [prefillTeamName, setPrefillTeamName] = useState("");
  const [prefillFound, setPrefillFound] = useState(false);

  const isEditMode = useMemo(() => !!editingId, [editingId]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          window.location.href = "/login?next=/register/player";
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profile?.is_profile_complete) {
          window.location.href = "/dashboard/profile?next=/register/player";
          return;
        }

        const baseForm: FormState = {
          ...initialFormState,
          fullName: profile?.full_name || "",
          phone: profile?.mobile_number || "",
          email: user.email || "",
          cityBase: profile?.city || "",
        };

        const playerId = getPlayerIdFromUrl();

        if (playerId) {
          const { data: existingRow, error: existingError } = await supabase
            .from("registration_players")
            .select("*")
            .eq("id", playerId)
            .eq("submitted_by_user_id", user.id)
            .maybeSingle();

          if (existingError || !existingRow) {
            throw existingError || new Error("Unable to load player registration for editing.");
          }

          if (!mounted) return;

          setEditingId(existingRow.id);
          setGeneratedPlayerCode(existingRow.player_code || "");
          setExistingPhotoUrl(existingRow.player_photo_url || "");
          setExistingPhotoPath(existingRow.player_photo_path || "");
          setForm({
            playerCode: existingRow.player_code || "",
            fullName: existingRow.full_name || baseForm.fullName,
            phone: existingRow.phone || baseForm.phone,
            email: existingRow.email || baseForm.email,
            cityBase: existingRow.city_base || baseForm.cityBase,
            role: existingRow.role || "",
            currentTeam: existingRow.current_team || "",
            battingStyle: existingRow.batting_style || "",
            bowlingStyle: existingRow.bowling_style || "",
            preferredTournament: existingRow.preferred_tournament || "",
            notes: existingRow.notes || "",
          });
        } else {
          if (!mounted) return;
          setForm(baseForm);
        }

        setAuthLoading(false);
      } catch (error: any) {
        setErrorMessage(error?.message || "Unable to load page.");
        setAuthLoading(false);
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadPlayerPhoto(file: File, userId: string) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt =
      ext === "png" || ext === "webp" || ext === "jpeg" || ext === "jpg"
        ? ext
        : "jpg";

    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("player-photos").getPublicUrl(fileName);

    return {
      path: fileName,
      url: data.publicUrl,
    };
  }

  async function fetchPrefillByPlayerCode() {
    const playerCode = (form.playerCode || "").trim().toUpperCase();

    if (!playerCode) {
      setErrorMessage("Please enter Player ID first.");
      return;
    }

    setFetchingCode(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data: existingPlayer } = await supabase
        .from("registration_players")
        .select("id, player_code, full_name")
        .eq("player_code", playerCode)
        .maybeSingle();

      if (existingPlayer) {
        throw new Error("This Player ID is already registered. Use Edit if this is your player.");
      }

      const { data: squadMatch, error: squadError } = await supabase
        .from("registration_team_squad_members")
        .select(`
          id,
          player_name,
          player_code,
          phone,
          notes,
          is_verified,
          registration_team_id,
          registration_teams (
            team_name
          )
        `)
        .eq("player_code", playerCode)
        .maybeSingle();

      if (squadError) throw squadError;

      if (!squadMatch) {
        throw new Error("No provisional squad player found with this Player ID.");
      }

      setPrefillSquadMemberId(squadMatch.id || "");
      setPrefillFound(true);
      setPrefillTeamName(
        Array.isArray(squadMatch.registration_teams)
          ? squadMatch.registration_teams[0]?.team_name || ""
          : (squadMatch.registration_teams as any)?.team_name || ""
      );

      setForm((prev) => ({
        ...prev,
        playerCode: squadMatch.player_code || prev.playerCode,
        fullName: squadMatch.player_name || prev.fullName,
        phone: squadMatch.phone || prev.phone,
        notes: squadMatch.notes || prev.notes,
        currentTeam:
          (Array.isArray(squadMatch.registration_teams)
            ? squadMatch.registration_teams[0]?.team_name
            : (squadMatch.registration_teams as any)?.team_name) || prev.currentTeam,
      }));

      setSuccessMessage("Provisional player details loaded successfully.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to fetch provisional player details.");
    } finally {
      setFetchingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User session not found. Please login again.");
      }

      const noPhotoInNewMode = !isEditMode && !playerPhotoFile;
      if (noPhotoInNewMode) {
        throw new Error("Player profile photo is required for new registration.");
      }

      if (playerPhotoFile && !isImageFile(playerPhotoFile)) {
        throw new Error("Please upload a valid image file: PNG, JPG, JPEG, or WEBP.");
      }

      let playerPhotoUrl: string | null = existingPhotoUrl || null;
      let playerPhotoPath: string | null = existingPhotoPath || null;

      if (playerPhotoFile) {
        const uploaded = await uploadPlayerPhoto(playerPhotoFile, user.id);
        playerPhotoUrl = uploaded.url;
        playerPhotoPath = uploaded.path;
      }

      if (isEditMode) {
        const { error } = await supabase
          .from("registration_players")
          .update({
            full_name: form.fullName,
            phone: form.phone || null,
            email: form.email || null,
            city_base: form.cityBase || null,
            role: form.role || null,
            current_team: form.currentTeam || null,
            batting_style: form.battingStyle || null,
            bowling_style: form.bowlingStyle || null,
            preferred_tournament: form.preferredTournament || null,
            notes: form.notes || null,
            player_photo_url: playerPhotoUrl,
            player_photo_path: playerPhotoPath,
            status: "pending",
            review_note: null,
          })
          .eq("id", editingId)
          .eq("submitted_by_user_id", user.id);

        if (error) throw error;

        setSuccessMessage("Player registration updated successfully and sent for review again.");
      } else {
        const insertPayload = {
          full_name: form.fullName,
          phone: form.phone || null,
          email: form.email || null,
          city_base: form.cityBase || null,
          role: form.role || null,
          current_team: form.currentTeam || null,
          batting_style: form.battingStyle || null,
          bowling_style: form.bowlingStyle || null,
          preferred_tournament: form.preferredTournament || null,
          notes: form.notes || null,
          player_photo_url: playerPhotoUrl,
          player_photo_path: playerPhotoPath,
          status: "pending",
          submitted_by_user_id: user.id,
          player_code: form.playerCode?.trim().toUpperCase() || null,
        };

        const { data, error } = await supabase
          .from("registration_players")
          .insert([insertPayload])
          .select("id, player_code")
          .single();

        if (error) throw error;

        if (prefillSquadMemberId && data?.id) {
          const { error: squadUpdateError } = await supabase
            .from("registration_team_squad_members")
            .update({
              is_verified: true,
              is_registered: true,
              linked_registration_player_id: data.id,
              player_name: form.fullName,
              phone: form.phone || null,
              notes: form.notes || null,
              player_photo_url: playerPhotoUrl,
              squad_mode: "verified",
            })
            .eq("id", prefillSquadMemberId);

          if (squadUpdateError) {
            throw squadUpdateError;
          }
        }

        setGeneratedPlayerCode(data?.player_code || form.playerCode || "");
        setSuccessMessage("Player registration submitted successfully.");
        setForm((prev) => ({
          ...initialFormState,
          fullName: prev.fullName,
          phone: prev.phone,
          email: prev.email,
          cityBase: prev.cityBase,
        }));
        setPlayerPhotoFile(null);
        setPrefillFound(false);
        setPrefillSquadMemberId("");
        setPrefillTeamName("");
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Something went wrong while saving the form.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (isEditMode) return;
    setForm((prev) => ({
      ...initialFormState,
      fullName: prev.fullName,
      phone: prev.phone,
      email: prev.email,
      cityBase: prev.cityBase,
    }));
    setPlayerPhotoFile(null);
    setGeneratedPlayerCode("");
    setSuccessMessage("");
    setErrorMessage("");
    setPrefillFound(false);
    setPrefillSquadMemberId("");
    setPrefillTeamName("");
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Checking account access...
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            {isEditMode ? "Edit Player Registration" : "Player Registration"}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            {isEditMode
              ? "Update your player registration"
              : "Create your player profile and join the cricket community platform in Egypt."}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            {isEditMode
              ? "Updating this record will send it back for review with status pending."
              : "Use a provisional Player ID if your team already added you in squad."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Player ID Support
            </p>
            <h2 className="mt-3 text-2xl font-bold">Prefill Ready</h2>
            <p className="mt-2 text-sm text-slate-600">
              Existing provisional squad Player IDs can prefill this form automatically.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Approval Flow
            </p>
            <h2 className="mt-3 text-2xl font-bold">Review Lifecycle</h2>
            <p className="mt-2 text-sm text-slate-600">
              After registration, provisional squad members can be upgraded to verified players.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Player Code
            </p>
            <h2 className="mt-3 text-2xl font-bold">Readable Code</h2>
            <p className="mt-2 text-sm text-slate-600">
              {generatedPlayerCode
                ? `Current Code: ${generatedPlayerCode}`
                : "Format: CCE + first 4 letters of name + 3 digits"}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <SectionTitle
            eyebrow="Registration Form"
            title={isEditMode ? "Edit Player Information" : "Player Information"}
            subtitle="This form stores entries in the registration_players table under your account."
          />

          {successMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
              {generatedPlayerCode ? (
                <div className="mt-2 font-semibold">Player Code: {generatedPlayerCode}</div>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {prefillFound ? (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Provisional squad player found.
              {prefillTeamName ? (
                <div className="mt-1 font-medium">Team: {prefillTeamName}</div>
              ) : null}
            </div>
          ) : null}

          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            {!isEditMode ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Existing / Provisional Player ID
                  </label>
                  <input
                    type="text"
                    value={form.playerCode}
                    onChange={(e) => updateField("playerCode", e.target.value.toUpperCase())}
                    placeholder="Enter Player ID if available"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={fetchPrefillByPlayerCode}
                    disabled={fetchingCode}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {fetchingCode ? "Fetching..." : "Fetch ID Details"}
                  </button>
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Enter full name"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Phone Number
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Enter email address"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                City / Base
              </label>
              <input
                type="text"
                value={form.cityBase}
                onChange={(e) => updateField("cityBase", e.target.value)}
                placeholder="Enter city or base"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Select role</option>
                <option value="Batter">Batter</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket Keeper">Wicket Keeper</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Current Team
              </label>
              <input
                type="text"
                value={form.currentTeam}
                onChange={(e) => updateField("currentTeam", e.target.value)}
                placeholder="Enter current team"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Batting Style
              </label>
              <select
                value={form.battingStyle}
                onChange={(e) => updateField("battingStyle", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Select batting style</option>
                <option value="Right Hand Bat">Right Hand Bat</option>
                <option value="Left Hand Bat">Left Hand Bat</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Bowling Style
              </label>
              <input
                type="text"
                value={form.bowlingStyle}
                onChange={(e) => updateField("bowlingStyle", e.target.value)}
                placeholder="Enter bowling style"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Player Profile Photo {!isEditMode ? <span className="text-red-600">*</span> : null}
              </label>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => setPlayerPhotoFile(e.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
              />
              <p className="mt-2 text-xs text-slate-500">
                {!isEditMode
                  ? "Profile photo is required for new registration."
                  : existingPhotoUrl
                    ? "Leave empty to keep current photo, or upload a new one to replace it."
                    : "Upload a player profile photo."}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Preferred Tournament
              </label>
              <select
                value={form.preferredTournament}
                onChange={(e) => updateField("preferredTournament", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Select tournament</option>
                <option value="ICAE Cricket Carnival">ICAE Cricket Carnival</option>
                <option value="EPCL">EPCL</option>
                <option value="Ramadan Nights Cricket Cup">Ramadan Nights Cricket Cup</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Notes
              </label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Any additional details"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? isEditMode
                    ? "Updating..."
                    : "Submitting..."
                  : isEditMode
                    ? "Update Registration"
                    : "Submit Registration"}
              </button>

              {!isEditMode ? (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset Form
                </button>
              ) : (
                <a
                  href="/dashboard"
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to Dashboard
                </a>
              )}
            </div>
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}