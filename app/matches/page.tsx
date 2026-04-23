"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title: string | null;
  slug: string | null;
};

type TeamRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
};

type MatchRow = {
  id: string;
  tournament_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  title: string | null;
  match_datetime: string | null;
  venue: string | null;
  status: string | null;
  result_summary: string | null;
  player_of_match: string | null;
  key_players: string | null;
  scorecard_pdf_url: string | null;
  external_score_url: string | null;
  is_featured_home: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
};

function formatMatchDateTime(value: string | null | undefined) {
  if (!value) return "Date not announced";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function getMatchPrimaryLink(match: MatchRow) {
  return match.external_score_url || match.scorecard_pdf_url || "";
}

export default function PublicMatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    loadMatches(selectedTournamentId, selectedStatus);
  }, [selectedTournamentId, selectedStatus]);

  async function loadSetup() {
    const [tournamentsRes, teamsRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, title, slug")
        .order("created_at", { ascending: false }),
      supabase.from("teams").select("id, name, slug, logo_url").order("name", { ascending: true }),
    ]);

    setTournaments((tournamentsRes.data || []) as TournamentRow[]);
    setTeams((teamsRes.data || []) as TeamRow[]);
  }

  async function loadMatches(tournamentId?: string, status?: string) {
    setLoading(true);

    let query = supabase
      .from("matches")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("match_datetime", { ascending: true });

    if (tournamentId) {
      query = query.eq("tournament_id", tournamentId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data } = await query;
    setMatches((data || []) as MatchRow[]);
    setLoading(false);
  }

  const teamMap = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const tournamentMap = useMemo(() => {
    return new Map(tournaments.map((item) => [item.id, item]));
  }, [tournaments]);

  function getTeamName(teamId: string | null | undefined) {
    if (!teamId) return null;
    return teamMap.get(teamId)?.name || null;
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Match Center
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Browse upcoming matches, completed results, and live tournament fixtures.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Follow tournament fixtures, result summaries, player of the match updates, and match links from one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filter by Tournament
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">All Tournaments</option>
                {tournaments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || "Untitled Tournament"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading matches...
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            No matches found.
          </div>
        ) : (
          <div className="grid gap-5">
            {matches.map((match) => {
              const tournament = match.tournament_id
                ? tournamentMap.get(match.tournament_id)
                : null;
              const primaryLink = getMatchPrimaryLink(match);

              return (
                <article
                  key={match.id}
                  className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {(match.status || "upcoming").toUpperCase()}
                        </span>

                        {tournament?.title ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {tournament.title}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="text-2xl font-bold text-slate-900">
                        {match.title ||
                          `${getTeamName(match.team_a_id) || "Team A"} vs ${
                            getTeamName(match.team_b_id) || "Team B"
                          }`}
                      </h2>

                      <p className="text-sm text-slate-600">
                        {formatMatchDateTime(match.match_datetime)}
                      </p>

                      <p className="text-sm text-slate-600">
                        Venue: {match.venue || "Venue update soon"}
                      </p>

                      <p className="text-sm text-slate-600">
                        Result: {match.result_summary || "Result not updated"}
                      </p>

                      <p className="text-sm text-slate-600">
                        Player of the Match: {match.player_of_match || "Not updated"}
                      </p>

                      <p className="text-sm text-slate-600">
                        Key Players: {match.key_players || "Not updated"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {primaryLink ? (
                        <a
                          href={primaryLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Open Match Link
                        </a>
                      ) : null}

                      {tournament?.slug ? (
                        <a
                          href={`/tournaments/${tournament.slug}`}
                          className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Open Tournament
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}