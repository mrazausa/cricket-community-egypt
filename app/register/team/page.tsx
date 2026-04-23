"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";
import { supabase } from "@/utils/supabase/client";

type SquadMode = "verified" | "unverified";

type SquadMember = {
  id?: string;
  squadMode: SquadMode;
  playerName: string;
  playerCode: string;
  phone: string;
  notes: string;
  isVerified: boolean;
  avatarSeed: string;
  playerPhotoUrl: string;
  linkedRegistrationPlayerId?: string | null;
};

type FormState = {
  tournament: string;
  teamName: string;
  captainName: string;
  managerName: string;
  phone: string;
  email: string;
  cityBase: string;
  notes: string;
};

const initialFormState: FormState = {
  tournament: "",
  teamName: "",
  captainName: "",
  managerName: "",
  phone: "",
  email: "",
  cityBase: "",
  notes: "",
};

const emptySquadMember: SquadMember = {
  squadMode: "verified",
  playerName: "",
  playerCode: "",
  phone: "",
  notes: "",
  isVerified: false,
  avatarSeed: "U",
  playerPhotoUrl: "",
  linkedRegistrationPlayerId: null,
};

function getTeamIdFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function isImageFile(file: File | null) {
  if (!file) return false;
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type);
}

function getAvatarSeed(name: string) {
  const trimmed = (name || "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}

function makeLocalProvisionalPlayerCode(name: string, index: number) {
  const cleaned = (name || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  const prefix = (cleaned + "XXXX").slice(0, 4);
  const suffix = String(index + 1).padStart(3, "0");
  return `CCE${prefix}${suffix}`;
}

export default function TeamRegistrationPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([
    { ...emptySquadMember },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [generatedTeamCode, setGeneratedTeamCode] = useState("");
  const [editingId, setEditingId] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [existingLogoPath, setExistingLogoPath] = useState("");
  const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null);

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
          window.location.href = "/login?next=/register/team";
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
          window.location.href = "/dashboard/profile?next=/register/team";
          return;
        }

        const baseForm: FormState = {
          ...initialFormState,
          captainName: profile?.full_name || "",
          phone: profile?.mobile_number || "",
          email: user.email || "",
          cityBase: profile?.city || "",
        };

        const teamId = getTeamIdFromUrl();

        if (teamId) {
          const { data: existingTeam, error: teamError } = await supabase
            .from("registration_teams")
            .select("*")
            .eq("id", teamId)
            .eq("submitted_by_user_id", user.id)
            .maybeSingle();

          if (teamError || !existingTeam) {
            throw teamError || new Error("Unable to load team registration for editing.");
          }

          const { data: existingSquad, error: squadError } = await supabase
            .from("registration_team_squad_members")
            .select("*")
            .eq("registration_team_id", teamId)
            .order("created_at", { ascending: true });

          if (squadError) {
            throw squadError;
          }

          if (!mounted) return;

          setEditingId(existingTeam.id);
          setGeneratedTeamCode(existingTeam.team_code || "");
          setExistingLogoUrl(existingTeam.team_logo_url || "");
          setExistingLogoPath(existingTeam.team_logo_path || "");
          setForm({
            tournament: existingTeam.tournament || "",
            teamName: existingTeam.team_name || "",
            captainName: existingTeam.captain_name || baseForm.captainName,
            managerName: existingTeam.manager_name || "",
            phone: existingTeam.phone || baseForm.phone,
            email: existingTeam.email || baseForm.email,
            cityBase: existingTeam.city_base || baseForm.cityBase,
            notes: existingTeam.notes || "",
          });

          if (existingSquad && existingSquad.length > 0) {
            setSquadMembers(
              existingSquad.map((row: any) => ({
                id: row.id,
                squadMode: row.squad_mode === "unverified" ? "unverified" : "verified",
                playerName: row.player_name || "",
                playerCode: row.player_code || "",
                phone: row.phone || "",
                notes: row.notes || "",
                isVerified: !!row.is_verified,
                avatarSeed: row.avatar_seed || getAvatarSeed(row.player_name || ""),
                playerPhotoUrl: row.player_photo_url || "",
                linkedRegistrationPlayerId: row.linked_registration_player_id || null,
              }))
            );
          } else {
            setSquadMembers([{ ...emptySquadMember }]);
          }
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
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateSquadMember(
    index: number,
    field: keyof SquadMember,
    value: string | boolean
  ) {
    setSquadMembers((prev) =>
      prev.map((member, i) => {
        if (i !== index) return member;

        const updated = { ...member, [field]: value } as SquadMember;

        if (field === "playerName" && typeof value === "string") {
          updated.avatarSeed = getAvatarSeed(value);

          if (updated.squadMode === "unverified" && !updated.id) {
            updated.playerCode = makeLocalProvisionalPlayerCode(value, index);
          }
        }

        return updated;
      })
    );
  }

  function switchSquadMode(index: number, mode: SquadMode) {
    setSquadMembers((prev) =>
      prev.map((member, i) => {
        if (i !== index) return member;

        if (mode === "verified") {
          return {
            ...member,
            squadMode: "verified",
            isVerified: false,
            playerCode: "",
            playerPhotoUrl: "",
            linkedRegistrationPlayerId: null,
          };
        }

        return {
          ...member,
          squadMode: "unverified",
          isVerified: false,
          playerPhotoUrl: "",
          linkedRegistrationPlayerId: null,
          playerCode: member.playerName
            ? makeLocalProvisionalPlayerCode(member.playerName, index)
            : "",
          avatarSeed: getAvatarSeed(member.playerName),
        };
      })
    );
  }

  function addSquadMember() {
    setSquadMembers((prev) => [...prev, { ...emptySquadMember }]);
  }

  function removeSquadMember(index: number) {
    setSquadMembers((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  async function verifyPlayerByCode(index: number) {
    const member = squadMembers[index];
    const code = (member.playerCode || "").trim().toUpperCase();

    if (!code) {
      setErrorMessage("Please enter Player ID before verification.");
      return;
    }

    setErrorMessage("");
    setVerifyingIndex(index);

    try {
      const { data, error } = await supabase
        .from("registration_players")
        .select("id, full_name, player_code, phone, player_photo_url")
        .eq("player_code", code)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Player ID not found. You can add this player as Unverified instead.");
      }

      setSquadMembers((prev) =>
        prev.map((row, i) => {
          if (i !== index) return row;

          return {
            ...row,
            squadMode: "verified",
            playerName: data.full_name || row.playerName,
            playerCode: data.player_code || code,
            phone: data.phone || row.phone,
            isVerified: true,
            avatarSeed: getAvatarSeed(data.full_name || row.playerName),
            playerPhotoUrl: data.player_photo_url || "",
            linkedRegistrationPlayerId: data.id || null,
          };
        })
      );
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to verify player by ID.");
    } finally {
      setVerifyingIndex(null);
    }
  }

  async function uploadTeamLogo(file: File, userId: string) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt =
      ext === "png" || ext === "webp" || ext === "jpeg" || ext === "jpg"
        ? ext
        : "jpg";

    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("team-logos").getPublicUrl(fileName);

    return {
      path: fileName,
      url: data.publicUrl,
    };
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

      const noLogoInNewMode = !isEditMode && !teamLogoFile;
      if (noLogoInNewMode) {
        throw new Error("Team logo is required for new registration.");
      }

      if (teamLogoFile && !isImageFile(teamLogoFile)) {
        throw new Error("Please upload a valid image file: PNG, JPG, JPEG, or WEBP.");
      }

      let teamLogoUrl: string | null = existingLogoUrl || null;
      let teamLogoPath: string | null = existingLogoPath || null;

      if (teamLogoFile) {
        const uploaded = await uploadTeamLogo(teamLogoFile, user.id);
        teamLogoUrl = uploaded.url;
        teamLogoPath = uploaded.path;
      }

      const validSquadMembers = squadMembers.filter(
        (member) =>
          member.playerName.trim() ||
          member.playerCode.trim() ||
          member.phone.trim() ||
          member.notes.trim()
      );

      const normalizedSquadMembers = validSquadMembers.map((member, index) => {
        if (member.squadMode === "verified") {
          return {
            squad_mode: "verified",
            player_name: member.playerName || null,
            player_code: (member.playerCode || "").toUpperCase() || null,
            phone: member.phone || null,
            notes: member.notes || null,
            is_registered: true,
            is_verified: true,
            linked_registration_player_id: member.linkedRegistrationPlayerId || null,
            avatar_seed: getAvatarSeed(member.playerName),
            player_photo_url: member.playerPhotoUrl || null,
          };
        }

        const provisionalCode =
          (member.playerCode || "").trim().toUpperCase() ||
          makeLocalProvisionalPlayerCode(member.playerName, index);

        return {
          squad_mode: "unverified",
          player_name: member.playerName || null,
          player_code: provisionalCode,
          phone: member.phone || null,
          notes: member.notes || null,
          is_registered: false,
          is_verified: false,
          linked_registration_player_id: null,
          avatar_seed: getAvatarSeed(member.playerName),
          player_photo_url: null,
        };
      });

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from("registration_teams")
          .update({
            tournament: form.tournament || null,
            team_name: form.teamName,
            captain_name: form.captainName || null,
            manager_name: form.managerName || null,
            phone: form.phone || null,
            email: form.email || null,
            city_base: form.cityBase || null,
            notes: form.notes || null,
            team_logo_url: teamLogoUrl,
            team_logo_path: teamLogoPath,
            squad_list:
              normalizedSquadMembers.length > 0
                ? normalizedSquadMembers.map((m) => m.player_name).filter(Boolean).join(", ")
                : null,
            status: "pending",
            review_note: null,
          })
          .eq("id", editingId)
          .eq("submitted_by_user_id", user.id);

        if (updateError) throw updateError;

        const { error: deleteOldSquadError } = await supabase
          .from("registration_team_squad_members")
          .delete()
          .eq("registration_team_id", editingId);

        if (deleteOldSquadError) throw deleteOldSquadError;

        if (normalizedSquadMembers.length > 0) {
          const squadPayload = normalizedSquadMembers.map((member) => ({
            registration_team_id: editingId,
            ...member,
          }));

          const { error: insertSquadError } = await supabase
            .from("registration_team_squad_members")
            .insert(squadPayload);

          if (insertSquadError) throw insertSquadError;
        }

        setSuccessMessage(
          "Team registration updated successfully and sent for review again."
        );
      } else {
        const { data: teamInsertData, error: teamInsertError } = await supabase
          .from("registration_teams")
          .insert([
            {
              submitted_by_user_id: user.id,
              status: "pending",
              tournament: form.tournament || null,
              team_name: form.teamName,
              captain_name: form.captainName || null,
              manager_name: form.managerName || null,
              phone: form.phone || null,
              email: form.email || null,
              city_base: form.cityBase || null,
              notes: form.notes || null,
              team_logo_url: teamLogoUrl,
              team_logo_path: teamLogoPath,
              squad_list:
                normalizedSquadMembers.length > 0
                  ? normalizedSquadMembers.map((m) => m.player_name).filter(Boolean).join(", ")
                  : null,
            },
          ])
          .select("id, team_code")
          .single();

        if (teamInsertError) throw teamInsertError;
        if (!teamInsertData?.id) {
          throw new Error("Team registration ID not returned.");
        }

        if (normalizedSquadMembers.length > 0) {
          const squadPayload = normalizedSquadMembers.map((member) => ({
            registration_team_id: teamInsertData.id,
            ...member,
          }));

          const { error: squadInsertError } = await supabase
            .from("registration_team_squad_members")
            .insert(squadPayload);

          if (squadInsertError) throw squadInsertError;
        }

        setGeneratedTeamCode(teamInsertData.team_code || "");
        setSuccessMessage("Team registration submitted successfully.");
        setTeamLogoFile(null);
        setSquadMembers([{ ...emptySquadMember }]);
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Something went wrong while saving the team registration."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (isEditMode) return;
    setForm((prev) => ({
      ...initialFormState,
      captainName: prev.captainName,
      phone: prev.phone,
      email: prev.email,
      cityBase: prev.cityBase,
    }));
    setSquadMembers([{ ...emptySquadMember }]);
    setTeamLogoFile(null);
    setGeneratedTeamCode("");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function renderAvatar(member: SquadMember) {
    if (member.playerPhotoUrl) {
      return (
        <img
          src={member.playerPhotoUrl}
          alt={member.playerName || "Player"}
          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
        />
      );
    }

    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
        {member.avatarSeed || "U"}
      </div>
    );
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
            {isEditMode ? "Edit Team Registration" : "Team Registration"}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            {isEditMode
              ? "Update your team registration"
              : "Register your team for upcoming cricket tournaments in Egypt."}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            {isEditMode
              ? "Updating this record will send it back for review with status pending."
              : "This protected registration is linked to your account and supports verified or provisional squad members."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Protected Entry
            </p>
            <h2 className="mt-3 text-2xl font-bold">Account Linked</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your team registration is tied to your own account for secure ownership and review.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Squad Logic
            </p>
            <h2 className="mt-3 text-2xl font-bold">Verified or Provisional</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use existing Player ID for verified players, or create provisional Player ID for unverified players.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Team Code
            </p>
            <h2 className="mt-3 text-2xl font-bold">Readable Code</h2>
            <p className="mt-2 text-sm text-slate-600">
              {generatedTeamCode
                ? `Current Code: ${generatedTeamCode}`
                : "Format: CCE + first 4 letters of team name + 3 digits"}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <SectionTitle
            eyebrow="Registration Form"
            title={isEditMode ? "Edit Team Information" : "Team Information"}
            subtitle="This form stores entries in the registration_teams table under your account."
          />

          {successMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
              {generatedTeamCode ? (
                <div className="mt-2 font-semibold">Team Code: {generatedTeamCode}</div>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Tournament
                </label>
                <select
                  value={form.tournament}
                  onChange={(e) => updateField("tournament", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Select tournament</option>
                  <option value="ICAE Cricket Carnival">ICAE Cricket Carnival</option>
                  <option value="EPCL">EPCL</option>
                  <option value="Ramadan Nights Cricket Cup">Ramadan Nights Cricket Cup</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={form.teamName}
                  onChange={(e) => updateField("teamName", e.target.value)}
                  placeholder="Enter team name"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Captain Name
                </label>
                <input
                  type="text"
                  value={form.captainName}
                  onChange={(e) => updateField("captainName", e.target.value)}
                  placeholder="Enter captain name"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={form.managerName}
                  onChange={(e) => updateField("managerName", e.target.value)}
                  placeholder="Enter manager name"
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
                  Team Logo {!isEditMode ? <span className="text-red-600">*</span> : null}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setTeamLogoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {!isEditMode
                    ? "Team logo is required for new registration. On mobile, camera capture can open directly."
                    : existingLogoUrl
                      ? "Leave empty to keep current logo, or upload a new one to replace it."
                      : "Upload a team logo."}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Team Notes
                </label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Any additional information"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Squad Members</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose verified player by Player ID, or create provisional player for later registration.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSquadMember}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Add Squad Member
                </button>
              </div>

              <div className="space-y-4">
                {squadMembers.map((member, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {renderAvatar(member)}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Squad Member {index + 1}
                          </h4>
                          <div className="mt-1 flex gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                member.isVerified
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {member.isVerified ? "Verified" : "Unverified"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSquadMember(index)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => switchSquadMode(index, "verified")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          member.squadMode === "verified"
                            ? "bg-slate-900 text-white"
                            : "border border-slate-300 text-slate-700"
                        }`}
                      >
                        Verified by Player ID
                      </button>

                      <button
                        type="button"
                        onClick={() => switchSquadMode(index, "unverified")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          member.squadMode === "unverified"
                            ? "bg-slate-900 text-white"
                            : "border border-slate-300 text-slate-700"
                        }`}
                      >
                        Add Unverified Player
                      </button>
                    </div>

                    {member.squadMode === "verified" ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Player ID
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={member.playerCode}
                              onChange={(e) =>
                                updateSquadMember(index, "playerCode", e.target.value.toUpperCase())
                              }
                              placeholder="Enter Player ID"
                              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => verifyPlayerByCode(index)}
                              disabled={verifyingIndex === index}
                              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {verifyingIndex === index ? "..." : "Verify"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Player Name
                          </label>
                          <input
                            type="text"
                            value={member.playerName}
                            disabled
                            placeholder="Auto fetched after verification"
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={member.phone}
                            disabled
                            placeholder="Auto fetched if available"
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={member.notes}
                            onChange={(e) =>
                              updateSquadMember(index, "notes", e.target.value)
                            }
                            placeholder="Optional notes"
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Player Name
                          </label>
                          <input
                            type="text"
                            value={member.playerName}
                            onChange={(e) =>
                              updateSquadMember(index, "playerName", e.target.value)
                            }
                            placeholder="Enter player name"
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Provisional Player ID
                          </label>
                          <input
                            type="text"
                            value={member.playerCode}
                            disabled
                            placeholder="Auto generated"
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-emerald-700 outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={member.phone}
                            onChange={(e) =>
                              updateSquadMember(index, "phone", e.target.value)
                            }
                            placeholder="Optional phone"
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={member.notes}
                            onChange={(e) =>
                              updateSquadMember(index, "notes", e.target.value)
                            }
                            placeholder="Optional notes"
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
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