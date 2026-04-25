"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import { supabase } from "@/utils/supabase/client";

type TeamInfo = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  badge: string | null;
};

type PlayerInfo = {
  id?: string | null;
  name?: string | null;
  full_name?: string | null;
  player_name?: string | null;
  display_name?: string | null;
  slug?: string | null;
  player_code?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  [key: string]: any;
};

type TeamRankingRow = {
  id: string;
  team_id: string | null;
  rank_position: number | null;
  points: number | null;
  matches: number | null;
  wins: number | null;
  form: string | null;
  rating: number | null;
  season_label: string | null;
  team_name_override?: string | null;
  team_logo_override_url?: string | null;
  updated_at?: string | null;
  teams?: TeamInfo | TeamInfo[] | null;
};

type PlayerRankingRow = {
  id: string;
  player_id: string | null;
  rank_position: number | null;
  category: string | null;
  rating: number | null;
  stat_value: string | null;
  season_label: string | null;
  player_name_override?: string | null;
  player_photo_override_url?: string | null;
  updated_at?: string | null;
  players?: PlayerInfo | PlayerInfo[] | null;
};

type TabKey = "teams" | "players";

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("teams");

  const [teamRows, setTeamRows] = useState<TeamRankingRow[]>([]);
  const [playerRows, setPlayerRows] = useState<PlayerRankingRow[]>([]);

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [teamError, setTeamError] = useState("");
  const [playerError, setPlayerError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  async function loadTeamRankings() {
    setLoadingTeams(true);
    setTeamError("");

    const { data, error } = await supabase
      .from("team_rankings")
      .select(
        `
          id,
          team_id,
          rank_position,
          points,
          matches,
          wins,
          form,
          rating,
          season_label,
          team_name_override,
          team_logo_override_url,
          updated_at,
          teams (
            id,
            name,
            slug,
            logo_url,
            badge
          )
        `
      )
      .order("rank_position", { ascending: true });

    if (error) {
      console.error("Failed to load team rankings:", error);
      setTeamRows([]);
      setTeamError(error.message || "Failed to load team rankings.");
      setLoadingTeams(false);
      return;
    }

    setTeamRows((data || []) as TeamRankingRow[]);
    setLoadingTeams(false);
  }

  async function loadPlayerRankings() {
    setLoadingPlayers(true);
    setPlayerError("");

    const { data, error } = await supabase
      .from("player_rankings")
      .select(
        `
          id,
          player_id,
          rank_position,
          category,
          rating,
          stat_value,
          season_label,
          player_name_override,
          player_photo_override_url,
          updated_at,
          players (*)
        `
      )
      .order("rank_position", { ascending: true });

    if (error) {
      console.error("Failed to load player rankings:", error);
      setPlayerRows([]);
      setPlayerError(error.message || "Failed to load player rankings.");
      setLoadingPlayers(false);
      return;
    }

    setPlayerRows((data || []) as PlayerRankingRow[]);
    setLoadingPlayers(false);
  }

  useEffect(() => {
    loadTeamRankings();
    loadPlayerRankings();
  }, []);

  const sortedTeamRows = useMemo(() => {
    return [...teamRows].sort((a, b) => {
      const aPos = a.rank_position ?? 999999;
      const bPos = b.rank_position ?? 999999;
      return aPos - bPos;
    });
  }, [teamRows]);

  const sortedPlayerRows = useMemo(() => {
    return [...playerRows].sort((a, b) => {
      const aPos = a.rank_position ?? 999999;
      const bPos = b.rank_position ?? 999999;
      return aPos - bPos;
    });
  }, [playerRows]);

  const playerCategories = useMemo(() => {
    return Array.from(
      new Set(
        playerRows
          .map((row) => row.category?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [playerRows]);

  const filteredPlayerRows = useMemo(() => {
    if (selectedCategory === "All") return sortedPlayerRows;
    return sortedPlayerRows.filter((row) => row.category === selectedCategory);
  }, [sortedPlayerRows, selectedCategory]);

  function getTeam(row: TeamRankingRow): TeamInfo | null {
    if (!row.teams) return null;
    if (Array.isArray(row.teams)) return row.teams[0] ?? null;
    return row.teams;
  }

  function getPlayer(row: PlayerRankingRow): PlayerInfo | null {
    if (!row.players) return null;
    if (Array.isArray(row.players)) return row.players[0] ?? null;
    return row.players;
  }

  function getTeamName(row: TeamRankingRow) {
    return (
      row.team_name_override?.trim() ||
      getTeam(row)?.name?.trim() ||
      "Unknown Team"
    );
  }

  function getTeamImage(row: TeamRankingRow) {
    const team = getTeam(row);
    return (
      row.team_logo_override_url?.trim() ||
      team?.logo_url ||
      team?.badge ||
      null
    );
  }

  function getPlayerName(row: PlayerRankingRow) {
    const player = getPlayer(row);
    return (
      row.player_name_override?.trim() ||
      player?.full_name?.trim() ||
      player?.name?.trim() ||
      player?.player_name?.trim() ||
      player?.display_name?.trim() ||
      "Unknown Player"
    );
  }

  function getPlayerImage(row: PlayerRankingRow) {
    const player = getPlayer(row);
    return (
      row.player_photo_override_url?.trim() ||
      player?.image_url ||
      player?.photo_url ||
      player?.avatar_url ||
      player?.profile_image_url ||
      null
    );
  }

  function getPlayerCode(row: PlayerRankingRow) {
    const player = getPlayer(row);
    return player?.player_code || null;
  }

  function splitForm(form: string | null) {
    if (!form) return [];
    return form.replace(/\s+/g, "").split("");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Official Rankings
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Cricket Community Egypt Rankings
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Explore the latest team standings and player rankings updated from
            the official platform database.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-3 shadow-md ring-1 ring-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("teams")}
              className={`h-11 rounded-2xl px-5 text-sm font-semibold transition ${
                activeTab === "teams"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Team Rankings
            </button>

            <button
              onClick={() => setActiveTab("players")}
              className={`h-11 rounded-2xl px-5 text-sm font-semibold transition ${
                activeTab === "players"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Player Rankings
            </button>
          </div>
        </div>
      </section>

      {activeTab === "teams" ? (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Teams
            </p>
            <h2 className="mt-1 text-3xl font-bold">Official Team Rankings</h2>
            <p className="mt-2 text-sm text-slate-600">
              Ranked by official position, with points, wins, form, and rating.
            </p>
          </div>

          {teamError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {teamError}
            </div>
          ) : loadingTeams ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
              Loading team rankings...
            </div>
          ) : sortedTeamRows.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
              No team rankings found.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:hidden">
                {sortedTeamRows.map((row) => {
                  const teamName = getTeamName(row);
                  const teamImage = getTeamImage(row);

                  return (
                    <div
                      key={row.id}
                      className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                          {row.rank_position ?? "-"}
                        </div>

                        {teamImage ? (
                          <img
                            src={teamImage}
                            alt={teamName}
                            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                            {teamName.slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {teamName}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {row.season_label || "Current Season"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <StatBox label="Points" value={row.points} />
                        <StatBox label="Matches" value={row.matches} />
                        <StatBox label="Wins" value={row.wins} />
                        <StatBox label="Rating" value={row.rating} />
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Recent Form
                        </p>
                        <div className="flex gap-2">
                          {splitForm(row.form).length > 0 ? (
                            splitForm(row.form).map((item, index) => (
                              <div
                                key={`${row.id}-${index}`}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700"
                              >
                                {item}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">
                              No form data
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-3xl bg-white shadow-md ring-1 ring-slate-200 md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-4 font-semibold">Rank</th>
                      <th className="px-4 py-4 font-semibold">Team</th>
                      <th className="px-4 py-4 font-semibold">Points</th>
                      <th className="px-4 py-4 font-semibold">Matches</th>
                      <th className="px-4 py-4 font-semibold">Wins</th>
                      <th className="px-4 py-4 font-semibold">Form</th>
                      <th className="px-4 py-4 font-semibold">Rating</th>
                      <th className="px-4 py-4 font-semibold">Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeamRows.map((row) => {
                      const teamName = getTeamName(row);
                      const teamImage = getTeamImage(row);

                      return (
                        <tr
                          key={row.id}
                          className="border-t border-slate-200 align-middle"
                        >
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {row.rank_position ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3.5">
                              {teamImage ? (
                                <img
                                  src={teamImage}
                                  alt={teamName}
                                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                  {teamName.slice(0, 1).toUpperCase()}
                                </div>
                              )}

                              <span className="truncate font-semibold text-slate-900">
                                {teamName}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">{row.points ?? "-"}</td>
                          <td className="px-4 py-4">{row.matches ?? "-"}</td>
                          <td className="px-4 py-4">{row.wins ?? "-"}</td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              {splitForm(row.form).length > 0 ? (
                                splitForm(row.form).map((item, index) => (
                                  <div
                                    key={`${row.id}-${index}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                                  >
                                    {item}
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">{row.rating ?? "-"}</td>
                          <td className="px-4 py-4">
                            {row.season_label || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Players
              </p>
              <h2 className="mt-1 text-3xl font-bold">
                Official Player Rankings
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Browse ranked players by category, stats, and rating.
              </p>
            </div>

            <div className="w-full sm:w-60">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
              >
                <option value="All">All</option>
                {playerCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {playerError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {playerError}
            </div>
          ) : loadingPlayers ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
              Loading player rankings...
            </div>
          ) : filteredPlayerRows.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
              No player rankings found.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:hidden">
                {filteredPlayerRows.map((row) => {
                  const playerName = getPlayerName(row);
                  const playerImage = getPlayerImage(row);
                  const playerCode = getPlayerCode(row);

                  return (
                    <div
                      key={row.id}
                      className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                          {row.rank_position ?? "-"}
                        </div>

                        {playerImage ? (
                          <img
                            src={playerImage}
                            alt={playerName}
                            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                            {playerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {playerName}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {playerCode || row.category || "Player Ranking"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <StatBox label="Category" value={row.category} />
                        <StatBox label="Rating" value={row.rating} />
                        <StatBox label="Stats" value={row.stat_value} />
                        <StatBox label="Season" value={row.season_label} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-3xl bg-white shadow-md ring-1 ring-slate-200 md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-4 font-semibold">Rank</th>
                      <th className="px-4 py-4 font-semibold">Player</th>
                      <th className="px-4 py-4 font-semibold">Category</th>
                      <th className="px-4 py-4 font-semibold">Stats</th>
                      <th className="px-4 py-4 font-semibold">Rating</th>
                      <th className="px-4 py-4 font-semibold">Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayerRows.map((row) => {
                      const playerName = getPlayerName(row);
                      const playerImage = getPlayerImage(row);
                      const playerCode = getPlayerCode(row);

                      return (
                        <tr
                          key={row.id}
                          className="border-t border-slate-200 align-middle"
                        >
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {row.rank_position ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3.5">
                              {playerImage ? (
                                <img
                                  src={playerImage}
                                  alt={playerName}
                                  className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                  {playerName.slice(0, 1).toUpperCase()}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold leading-5 text-slate-900">
                                  {playerName}
                                </div>
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {playerCode || row.category || "Player Ranking"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">{row.category || "-"}</td>
                          <td className="px-4 py-4">{row.stat_value || "-"}</td>
                          <td className="px-4 py-4">{row.rating ?? "-"}</td>
                          <td className="px-4 py-4">
                            {row.season_label || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-bold text-slate-900">
        {value === null || value === undefined || value === "" ? "-" : value}
      </p>
    </div>
  );
}