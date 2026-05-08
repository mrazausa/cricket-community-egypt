"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TeamRow = {
  id: string;
  team_name: string | null;
  team_code: string | null;
  team_logo_url: string | null;
  tournament: string | null;
  captain_name: string | null;
  manager_name: string | null;
  phone: string | null;
  email: string | null;
  city_base: string | null;
  notes: string | null;
  status: string | null;
  submitted_by_user_id: string | null;
};

type SquadRow = {
  id: string;
  player_name: string | null;
  player_code: string | null;
  phone: string | null;
  notes: string | null;
  is_verified: boolean;
  squad_mode: string | null;
  avatar_seed: string | null;
  player_photo_url: string | null;
};

function getInitial(value?: string | null, fallback = "T") {
  const text = (value || "").trim();
  return text ? text.charAt(0).toUpperCase() : fallback;
}

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
  return "bg-slate-100 text-slate-700";
}

export default function TeamDetailPage() {
  const params = useParams();
  const code = String(params?.code || "");

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [squad, setSquad] = useState<SquadRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadPage();
  }, [code]);

  async function loadPage() {
    setLoading(true);

    const { data: teamRes, error: teamError } = await supabase
      .from("registration_teams")
      .select("*")
      .eq("team_code", code)
      .maybeSingle();

    if (teamError || !teamRes) {
      setTeam(null);
      setSquad([]);
      setLoading(false);
      return;
    }

    const { data: squadRes } = await supabase
      .from("registration_team_squad_members")
      .select("*")
      .eq("registration_team_id", teamRes.id);

    const { data: userRes } = await supabase.auth.getUser();
    const currentUserId = userRes.user?.id || "";

    setTeam(teamRes as TeamRow);
    setSquad((squadRes || []) as SquadRow[]);
    setIsOwner(!!currentUserId && currentUserId === teamRes.submitted_by_user_id);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading team page...
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!team) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Team not found.
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {team.team_logo_url ? (
              <img
                src={team.team_logo_url}
                alt={team.team_name || "Team"}
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 text-3xl font-bold text-white ring-2 ring-white/20">
                {getInitial(team.team_name, "T")}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Team Page
              </p>
              <h1 className="text-3xl font-bold sm:text-5xl">
                {team.team_name || "Unnamed Team"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                {team.team_code ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 font-semibold">
                    {team.team_code}
                  </span>
                ) : null}
                <span className={`rounded-full px-3 py-1 font-semibold ${getStatusBadge(team.status)}`}>
                  {formatStatus(team.status)}
                </span>
                {team.tournament ? (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {team.tournament}
                  </span>
                ) : null}
              </div>
            </div>

            {isOwner ? (
              <a
                href={`/register/team?id=${team.id}`}
                className="inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Edit Team / Manage Squad
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Team Details
            </p>
            <h2 className="mt-3 text-2xl font-bold">Overview</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Captain:</span> {team.captain_name || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Manager:</span> {team.manager_name || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">City / Base:</span> {team.city_base || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Phone:</span> {team.phone || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {team.email || "Not set"}</p>
            </div>

            {team.notes ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {team.notes}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Squad
            </p>
            <h2 className="mt-3 text-2xl font-bold">Team Players</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {squad.length > 0 ? (
                squad.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      {row.player_photo_url ? (
                        <img
                          src={row.player_photo_url}
                          alt={row.player_name || "Player"}
                          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                          {row.avatar_seed || getInitial(row.player_name, "U")}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {row.player_name || "Unnamed Player"}
                            </p>
                            {row.player_code ? (
                              <p className="mt-1 text-xs font-semibold text-emerald-700">
                                {row.player_code}
                              </p>
                            ) : null}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              row.is_verified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.is_verified ? "Verified" : "Unverified"}
                          </span>
                        </div>

                        {row.phone ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Phone: {row.phone}
                          </p>
                        ) : null}

                        {row.notes ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {row.notes}
                          </p>
                        ) : null}

                        {row.player_code ? (
                          <a
                            href={`/players/${row.player_code}`}
                            className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            View Player
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                  No squad members added yet.
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