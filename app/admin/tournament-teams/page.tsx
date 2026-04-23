"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title: string | null;
  slug: string | null;
  status: string | null;
};

type TeamRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
  badge?: string | null;
};

type TournamentTeamRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  sort_order: number | null;
  created_at?: string | null;
};

function formatError(error: any) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export default function AdminTournamentTeamsPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [links, setLinks] = useState<TournamentTeamRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [processingTeamId, setProcessingTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentTeams(selectedTournamentId);
    } else {
      setLinks([]);
      setLoadingLinks(false);
    }
  }, [selectedTournamentId]);

  async function loadSetup() {
    setLoadingSetup(true);
    setMessage("");
    setMessageType("");

    const [tournamentsRes, teamsRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, title, slug, status")
        .order("created_at", { ascending: false }),
      supabase
        .from("teams")
        .select("id, name, slug, logo_url, badge")
        .order("name", { ascending: true }),
    ]);

    if (tournamentsRes.error || teamsRes.error) {
      const error = tournamentsRes.error || teamsRes.error;
      setMessage(`Failed to load setup data. ${formatError(error)}`);
      setMessageType("error");
      setLoadingSetup(false);
      return;
    }

    const tournamentRows = (tournamentsRes.data || []) as TournamentRow[];
    const teamRows = (teamsRes.data || []) as TeamRow[];

    setTournaments(tournamentRows);
    setTeams(teamRows);

    if (tournamentRows.length > 0) {
      setSelectedTournamentId((prev) => prev || tournamentRows[0].id);
    }

    setLoadingSetup(false);
  }

  async function loadTournamentTeams(tournamentId: string) {
    setLoadingLinks(true);

    const { data, error } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id, team_id, sort_order, created_at")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setLinks([]);
      setMessage(`Failed to load tournament teams. ${formatError(error)}`);
      setMessageType("error");
      setLoadingLinks(false);
      return;
    }

    setLinks((data || []) as TournamentTeamRow[]);
    setLoadingLinks(false);
  }

  async function addTeamToTournament(teamId: string) {
    if (!selectedTournamentId) {
      setMessage("Please select a tournament first.");
      setMessageType("error");
      return;
    }

    setProcessingTeamId(teamId);
    setMessage("");
    setMessageType("");

    try {
      const alreadyLinked = links.some((item) => item.team_id === teamId);
      if (alreadyLinked) {
        setMessage("This team is already linked to the selected tournament.");
        setMessageType("error");
        setProcessingTeamId(null);
        return;
      }

      const nextSortOrder =
        links.length > 0
          ? Math.max(...links.map((item) => item.sort_order ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("tournament_teams").insert({
        tournament_id: selectedTournamentId,
        team_id: teamId,
        sort_order: nextSortOrder,
      });

      if (error) throw error;

      setMessage("Team linked to tournament successfully.");
      setMessageType("success");
      await loadTournamentTeams(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to link team. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setProcessingTeamId(null);
    }
  }

  async function removeTeamFromTournament(linkId: string) {
    const ok = window.confirm("Remove this team from the selected tournament?");
    if (!ok) return;

    setProcessingTeamId(linkId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase
        .from("tournament_teams")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setMessage("Team removed from tournament successfully.");
      setMessageType("success");
      await loadTournamentTeams(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to remove team. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setProcessingTeamId(null);
    }
  }

  async function updateSortOrder(linkId: string, value: number) {
    try {
      const { error } = await supabase
        .from("tournament_teams")
        .update({ sort_order: value })
        .eq("id", linkId);

      if (error) throw error;

      setLinks((prev) =>
        prev.map((item) =>
          item.id === linkId ? { ...item, sort_order: value } : item
        )
      );
    } catch (error) {
      setMessage(`Failed to update sort order. ${formatError(error)}`);
      setMessageType("error");
    }
  }

  const linkedTeamIds = useMemo(() => {
    return new Set(links.map((item) => item.team_id));
  }, [links]);

  const linkedTeams = useMemo(() => {
    return links
      .map((link) => {
        const team = teams.find((item) => item.id === link.team_id);
        return {
          link,
          team,
        };
      })
      .filter((item) => item.team);
  }, [links, teams]);

  const availableTeams = useMemo(() => {
    return teams.filter((team) => !linkedTeamIds.has(team.id));
  }, [teams, linkedTeamIds]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Tournament Teams
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Link approved teams to a tournament without creating new teams.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Choose a tournament, add existing approved teams, remove them if needed,
            and control display order for the tournament page and homepage team section.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Tournament
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                disabled={loadingSetup}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">Select tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title || "Untitled Tournament"}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Linked Teams
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {linkedTeams.length}
              </p>
            </div>
          </div>

          {message ? (
            <div
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                messageType === "error"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Available Teams
            </p>
            <h2 className="mt-2 text-2xl font-bold">Add Teams to Tournament</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              These are approved teams not yet linked to the selected tournament.
            </p>
          </div>

          {!selectedTournamentId ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              Select a tournament first.
            </div>
          ) : loadingSetup || loadingLinks ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              Loading available teams...
            </div>
          ) : availableTeams.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              No more teams available to add.
            </div>
          ) : (
            <div className="space-y-4">
              {availableTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {team.name || "Unnamed Team"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {team.badge || team.slug || "Approved Team"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => addTeamToTournament(team.id)}
                    disabled={processingTeamId === team.id}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingTeamId === team.id ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Linked Teams
            </p>
            <h2 className="mt-2 text-2xl font-bold">Manage Tournament Teams</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Remove teams or adjust sort order for display sequence.
            </p>
          </div>

          {!selectedTournamentId ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              Select a tournament first.
            </div>
          ) : loadingLinks ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              Loading linked teams...
            </div>
          ) : linkedTeams.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              No teams linked yet for this tournament.
            </div>
          ) : (
            <div className="space-y-4">
              {linkedTeams.map(({ link, team }) => (
                <div
                  key={link.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {team?.name || "Unnamed Team"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {team?.badge || team?.slug || "Tournament Team"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={link.sort_order ?? 0}
                          onChange={(e) =>
                            updateSortOrder(link.id, Number(e.target.value) || 0)
                          }
                          className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTeamFromTournament(link.id)}
                        disabled={processingTeamId === link.id}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingTeamId === link.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}