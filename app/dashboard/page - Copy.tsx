"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  mobile_number: string | null;
  country: string | null;
  city: string | null;
  whatsapp_number: string | null;
  is_profile_complete: boolean;
};

type RegistrationPlayerRow = {
  id: string;
  full_name: string | null;
  player_code: string | null;
  player_photo_url?: string | null;
  status: string;
  review_note: string | null;
  created_at?: string | null;
};

type RegistrationTeamRow = {
  id: string;
  team_name: string | null;
  team_code?: string | null;
  status: string;
  review_note: string | null;
  created_at?: string | null;
};

function formatStatus(status?: string | null) {
  if (!status) return "Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadge(status?: string | null) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "needs_changes") return "bg-amber-100 text-amber-700";
  if (status === "withdrawn") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [teamRegistrations, setTeamRegistrations] = useState<RegistrationTeamRow[]>([]);
  const [playerRegistrations, setPlayerRegistrations] = useState<RegistrationPlayerRow[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      window.location.href = "/login?next=/dashboard";
      return;
    }

    const currentUserId = session.user.id;
    setUserId(currentUserId);
    setUserEmail(session.user.email || "");

    const [profileRes, teamRes, playerRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle(),

      supabase
        .from("registration_teams")
        .select("id, team_name, team_code, status, review_note, created_at")
        .eq("submitted_by_user_id", currentUserId)
        .order("created_at", { ascending: false }),

      supabase
        .from("registration_players")
        .select("id, full_name, player_code, player_photo_url, status, review_note, created_at")
        .eq("submitted_by_user_id", currentUserId)
        .order("created_at", { ascending: false }),
    ]);

    setProfile((profileRes.data as ProfileRow | null) || null);
    setTeamRegistrations((teamRes.data || []) as RegistrationTeamRow[]);
    setPlayerRegistrations((playerRes.data || []) as RegistrationPlayerRow[]);
    setLoading(false);
  }

  const profileComplete = useMemo(() => {
    return !!profile?.is_profile_complete;
  }, [profile]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleDeletePlayer(row: RegistrationPlayerRow) {
    const message =
      row.status === "approved"
        ? `This player registration is already approved.

Deleting it will remove the registration data from your dashboard.

If this player is already being used in other linked modules, those linked records may need separate admin review.

Do you want to continue deleting this approved player registration?`
        : `Are you sure you want to delete this player registration?

All registration data for this player will be removed from your dashboard.

Do you want to continue?`;

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setActionLoadingId(row.id);

    const { error } = await supabase
      .from("registration_players")
      .delete()
      .eq("id", row.id)
      .eq("submitted_by_user_id", userId);

    setActionLoadingId("");

    if (error) {
      alert(error.message || "Unable to delete player registration.");
      return;
    }

    await loadPage();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading dashboard...
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            My Dashboard
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Welcome to your Cricket Community account
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Signed in as {userEmail || "User"}.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/dashboard/profile"
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Complete Profile
            </a>

            <a
              href={
                profileComplete
                  ? "/register/team"
                  : "/dashboard/profile?next=/register/team"
              }
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Register Team
            </a>

            <a
              href={
                profileComplete
                  ? "/register/player"
                  : "/dashboard/profile?next=/register/player"
              }
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Register Player
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Logout
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        {!profileComplete ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
            <p className="font-semibold">Profile completion required.</p>
            <p className="mt-1 text-sm">
              Please complete your profile before submitting team or player registrations.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm">
            <p className="font-semibold">Profile complete.</p>
            <p className="mt-1 text-sm">
              You can now submit and manage your registrations.
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Profile
            </p>
            <h2 className="mt-3 text-2xl font-bold">Account Summary</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Full Name:</span>{" "}
                {profile?.full_name || "Not updated"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Mobile:</span>{" "}
                {profile?.mobile_number || "Not updated"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Country:</span>{" "}
                {profile?.country || "Not updated"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">City:</span>{" "}
                {profile?.city || "Not updated"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">WhatsApp:</span>{" "}
                {profile?.whatsapp_number || "Not updated"}
              </p>
            </div>

            <a
              href="/dashboard/profile"
              className="mt-5 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Edit Profile
            </a>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Team Registrations
            </p>
            <h2 className="mt-3 text-2xl font-bold">My Teams</h2>

            <div className="mt-4 space-y-3">
              {teamRegistrations.length > 0 ? (
                teamRegistrations.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {row.team_name || "Unnamed Team"}
                        </p>
                        {row.team_code ? (
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            Code: {row.team_code}
                          </p>
                        ) : null}
                        {row.created_at ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Submitted: {formatDate(row.created_at)}
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                          row.status
                        )}`}
                      >
                        {formatStatus(row.status)}
                      </span>
                    </div>

                    {row.review_note ? (
                      <p className="mt-2 text-sm text-slate-600">{row.review_note}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                  No team registration submitted yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Player Registrations
            </p>
            <h2 className="mt-3 text-2xl font-bold">My Players</h2>

            <div className="mt-4 space-y-3">
              {playerRegistrations.length > 0 ? (
                playerRegistrations.slice(0, 10).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      {row.player_photo_url ? (
                        <img
                          src={row.player_photo_url}
                          alt={row.full_name || "Player"}
                          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                          {(row.full_name || "P").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {row.full_name || "Unnamed Player"}
                            </p>

                            {row.player_code ? (
                              <p className="mt-1 text-xs font-semibold text-emerald-700">
                                Player ID: {row.player_code}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-red-600">
                                Player ID not generated yet
                              </p>
                            )}

                            {row.created_at ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Submitted: {formatDate(row.created_at)}
                              </p>
                            ) : null}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                              row.status
                            )}`}
                          >
                            {formatStatus(row.status)}
                          </span>
                        </div>

                        {row.review_note ? (
                          <p className="mt-2 text-sm text-slate-600">{row.review_note}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={`/register/player?id=${row.id}`}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Edit
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(row)}
                            disabled={actionLoadingId === row.id}
                            className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            {actionLoadingId === row.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                  No player registration submitted yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}