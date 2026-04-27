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
  award_category?: string | null;
  player_display_name?: string | null;
  team_display_name?: string | null;
  player_image_url?: string | null;
  period_label?: string | null;
  runs?: number | null;
  wickets?: number | null;
  matches?: number | null;
  mvp_points?: number | null;
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
  const [activeTab, setActiveTab] = useState<TabKey>("players");

  const [teamRows, setTeamRows] = useState<TeamRankingRow[]>([]);
  const [playerRows, setPlayerRows] = useState<PlayerRankingRow[]>([]);

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [teamError, setTeamError] = useState("");
  const [playerError, setPlayerError] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState<string>("Last 2 Years");

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
          award_category,
          player_display_name,
          team_display_name,
          player_image_url,
          period_label,
          runs,
          wickets,
          matches,
          mvp_points,
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

  const periodOptions = useMemo(() => {
    const preferred = ["Last 2 Years", "All Time", "Last 1 Year", "2026", "2025", "2024", "2023", "2022"];
    const found = Array.from(
      new Set(
        playerRows
          .map((row) => (row.period_label || row.season_label || "").trim())
          .filter(Boolean)
      )
    );
    const merged = [
      ...preferred.filter((period) => found.includes(period)),
      ...found.filter((period) => !preferred.includes(period)),
    ];
    return merged.length > 0 ? merged : preferred;
  }, [playerRows]);

  const periodPlayerRows = useMemo(() => {
    const periodRows = sortedPlayerRows.filter(
      (row) => (row.period_label || row.season_label || "All Time") === selectedPeriod
    );
    if (periodRows.length > 0) return periodRows;
    return sortedPlayerRows.filter(
      (row) => (row.period_label || row.season_label || "All Time") === "All Time"
    );
  }, [sortedPlayerRows, selectedPeriod]);

  const rankingBlocks = useMemo(
    () => [
      { key: "MVP", title: "MVP Rankings", subtitle: "Most valuable players by complete impact score." },
      { key: "Batsman", title: "Best Batsmen", subtitle: "Top batting performers by runs and batting score." },
      { key: "Bowler", title: "Best Bowlers", subtitle: "Top wicket-takers and bowling impact leaders." },
      { key: "All-Rounder", title: "Best All-Rounders", subtitle: "Balanced impact with bat, ball, and field." },
      { key: "Fielder", title: "Best Fielders", subtitle: "Fielding impact leaders." },
      { key: "Most Runs", title: "Most Runs", subtitle: "Run-scoring leaderboard." },
      { key: "Most Wickets", title: "Most Wickets", subtitle: "Wicket-taking leaderboard." },
    ],
    []
  );

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
      row.player_display_name?.trim() ||
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
      row.player_image_url?.trim() ||
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

  function getPlayerCategory(row: PlayerRankingRow) {
    return (row.award_category || row.category || "Overall").trim();
  }

  function getPlayerTeam(row: PlayerRankingRow) {
    return row.team_display_name?.trim() || "CCE Player";
  }

  function getCategoryRows(category: string) {
    return periodPlayerRows
      .filter((row) => getPlayerCategory(row).toLowerCase() === category.toLowerCase())
      .sort((a, b) => (a.rank_position ?? 999999) - (b.rank_position ?? 999999));
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
          <div className="mb-6 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-200 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Players
                </p>
                <h2 className="mt-1 text-3xl font-bold">
                  Official Player Rankings
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Select a period and review every category in separate leaderboard blocks.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {periodOptions.map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`h-10 rounded-2xl px-4 text-sm font-bold transition ${
                      selectedPeriod === period
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
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
          ) : playerRows.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
              No player rankings found.
            </div>
          ) : (
            <div className="grid gap-5">
              {rankingBlocks.map((block) => {
                const rows = getCategoryRows(block.key).slice(0, 10);

                return (
                  <section
                    key={block.key}
                    className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                          {periodPlayerRows.length > 0 ? selectedPeriod : "All Time"}
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                          {block.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {block.subtitle}
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                        Top {rows.length}
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className="p-5 text-sm text-slate-500">
                        No ranking data available for this category.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {rows.map((row) => {
                          const playerName = getPlayerName(row);
                          const playerImage = getPlayerImage(row);
                          const playerCode = getPlayerCode(row);
                          const category = getPlayerCategory(row);

                          return (
                            <div
                              key={row.id}
                              className="grid gap-4 p-4 sm:grid-cols-[70px_1fr_170px] sm:items-center sm:p-5"
                            >
                              <div className="flex items-center gap-3 sm:block">
                                <div
                                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black ${
                                    row.rank_position === 1
                                      ? "bg-slate-950 text-white"
                                      : "bg-slate-100 text-slate-800"
                                  }`}
                                >
                                  {row.rank_position ?? "-"}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 sm:mt-2 sm:block">
                                  Rank
                                </span>
                              </div>

                              <div className="flex min-w-0 items-center gap-3.5">
                                {playerImage ? (
                                  <img
                                    src={playerImage}
                                    alt={playerName}
                                    className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                                  />
                                ) : (
                                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                    {playerName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <h4 className="truncate text-base font-black text-slate-950 sm:text-lg">
                                    {playerName}
                                  </h4>
                                  <p className="mt-0.5 truncate text-sm text-slate-600">
                                    {getPlayerTeam(row)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {playerCode || category}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                    Rating
                                  </p>
                                  <p className="mt-1 text-lg font-black text-emerald-700">
                                    {formatValue(row.rating)}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200 sm:hidden">
                                  {row.stat_value || `${formatValue(row.runs)} runs • ${formatValue(row.wickets)} wkts`}
                                </div>
                              </div>

                              <div className="hidden rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 sm:col-span-3 sm:block">
                                {row.stat_value || `${formatValue(row.runs)} runs • ${formatValue(row.wickets)} wickets • ${formatValue(row.matches)} matches`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
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
        {formatValue(value)}
      </p>
    </div>
  );
}