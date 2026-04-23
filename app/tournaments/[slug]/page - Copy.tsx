"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title: string | null;
  slug: string | null;
  status: string | null;
  timeline: string | null;
  overview: string | null;
  logo_url: string | null;
  venue: string | null;
  format: string | null;
  is_featured_home?: boolean | null;
  hero_title_font_mobile?: number | null;
  hero_title_font_desktop?: number | null;
  hero_title_max_width?: number | null;
  hero_title_align?: "left" | "center" | "right" | null;
  hero_logo_size_mobile?: number | null;
  hero_logo_size_desktop?: number | null;
  hero_logo_top_margin?: number | null;
  hero_subtitle_font_mobile?: number | null;
  hero_subtitle_font_desktop?: number | null;
  hero_subtitle_max_width?: number | null;
};

type TeamInfo = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
  badge?: string | null;
};

type PlayerInfo = {
  id?: string | null;
  name?: string | null;
  full_name?: string | null;
  player_name?: string | null;
  display_name?: string | null;
  slug?: string | null;
  [key: string]: any;
};

type TournamentTeamLinkRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  sort_order: number | null;
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
};

type NewsRow = {
  id: string;
  tournament_id: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
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
  players?: PlayerInfo | PlayerInfo[] | null;
};

function formatTournamentStatus(status: string | null | undefined) {
  if (!status) return "Tournament";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getHeroAlignClass(align?: string | null) {
  if (align === "left") return "items-start text-left";
  if (align === "right") return "items-end text-right";
  return "items-center text-center";
}

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

function getPlayerName(player: PlayerInfo | null) {
  if (!player) return "Unknown Player";
  return (
    player.name ||
    player.full_name ||
    player.player_name ||
    player.display_name ||
    "Unknown Player"
  );
}

function getTeamNameById(teamId: string | null | undefined, teams: TeamInfo[]) {
  if (!teamId) return null;
  const team = teams.find((item) => item.id === teamId);
  return team?.name || null;
}

function formatMatchDateTime(value: string | null | undefined) {
  if (!value) return "Date not announced";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function getMatchPrimaryLink(match: MatchRow | null) {
  if (!match) return "";
  return match.external_score_url || match.scorecard_pdf_url || "";
}

export default function PublicTournamentPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const [tournamentTeams, setTournamentTeams] = useState<TeamInfo[]>([]);
  const [loadingTournamentTeams, setLoadingTournamentTeams] = useState(true);

  const [nextMatch, setNextMatch] = useState<MatchRow | null>(null);
  const [latestResult, setLatestResult] = useState<MatchRow | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchRow[]>([]);
  const [latestNews, setLatestNews] = useState<NewsRow[]>([]);
  const [loadingLiveBlocks, setLoadingLiveBlocks] = useState(true);

  const [teamRankings, setTeamRankings] = useState<TeamRankingRow[]>([]);
  const [playerRankings, setPlayerRankings] = useState<PlayerRankingRow[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);

  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (!slug) return;
    loadTournamentBySlug(slug);
  }, [slug]);

  useEffect(() => {
    if (!tournament?.id) return;
    loadTournamentTeams(tournament.id);
    loadLiveBlocks(tournament.id);
    loadRankings();
  }, [tournament?.id]);

  async function loadTournamentBySlug(slug: string) {
    setLoadingTournament(true);
    setPageError("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      setTournament(null);
      setPageError("Tournament not found.");
      setLoadingTournament(false);
      return;
    }

    setTournament(data as TournamentRow);
    setLoadingTournament(false);
  }

  async function loadTournamentTeams(tournamentId: string) {
    setLoadingTournamentTeams(true);

    const { data: links, error: linksError } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id, team_id, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true });

    if (linksError) {
      setTournamentTeams([]);
      setLoadingTournamentTeams(false);
      return;
    }

    const linkRows = (links || []) as TournamentTeamLinkRow[];
    const teamIds = Array.from(new Set(linkRows.map((item) => item.team_id).filter(Boolean)));

    if (teamIds.length === 0) {
      setTournamentTeams([]);
      setLoadingTournamentTeams(false);
      return;
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, slug, logo_url, badge")
      .in("id", teamIds);

    if (teamsError) {
      setTournamentTeams([]);
      setLoadingTournamentTeams(false);
      return;
    }

    const teamMap = new Map(
      ((teamsData || []) as TeamInfo[]).map((team) => [team.id, team])
    );

    const orderedTeams = linkRows
      .map((link) => teamMap.get(link.team_id))
      .filter(Boolean) as TeamInfo[];

    setTournamentTeams(orderedTeams);
    setLoadingTournamentTeams(false);
  }

  async function loadLiveBlocks(tournamentId: string) {
    setLoadingLiveBlocks(true);

    const [nextMatchRes, latestResultRes, recentMatchesRes, latestNewsRes] =
      await Promise.all([
        supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .eq("status", "upcoming")
          .order("match_datetime", { ascending: true })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .eq("status", "completed")
          .order("match_datetime", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("sort_order", { ascending: true })
          .order("match_datetime", { ascending: true })
          .limit(6),

        supabase
          .from("news")
          .select("*")
          .eq("tournament_id", tournamentId)
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

    setNextMatch((nextMatchRes.data as MatchRow | null) || null);
    setLatestResult((latestResultRes.data as MatchRow | null) || null);
    setRecentMatches((recentMatchesRes.data || []) as MatchRow[]);
    setLatestNews((latestNewsRes.data || []) as NewsRow[]);
    setLoadingLiveBlocks(false);
  }

  async function loadRankings() {
    setLoadingRankings(true);

    const [teamRankingsRes, playerRankingsRes] = await Promise.all([
      supabase
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
          teams (
            id,
            name,
            slug,
            logo_url,
            badge
          )
        `
        )
        .order("rank_position", { ascending: true })
        .limit(5),

      supabase
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
          players (*)
        `
        )
        .order("rank_position", { ascending: true })
        .limit(5),
    ]);

    setTeamRankings((teamRankingsRes.data || []) as TeamRankingRow[]);
    setPlayerRankings((playerRankingsRes.data || []) as PlayerRankingRow[]);
    setLoadingRankings(false);
  }

  const tournamentLink = useMemo(() => {
    return tournament?.slug ? `/tournaments/${tournament.slug}` : "/tournaments";
  }, [tournament?.slug]);

  const primaryLiveLink = getMatchPrimaryLink(nextMatch) || getMatchPrimaryLink(latestResult);

  if (loadingTournament) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
            Loading tournament...
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
            {pageError || "Tournament not found."}
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
          <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#02103a] to-emerald-900 p-5 text-white shadow-2xl sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Tournament Center
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                {formatTournamentStatus(tournament.status)}
              </span>
            </div>

            <div
              className={`mt-5 flex flex-col ${getHeroAlignClass(
                tournament.hero_title_align
              )}`}
              style={{
                marginTop: `${tournament.hero_logo_top_margin ?? 10}px`,
              }}
            >
              {tournament.logo_url ? (
                <img
                  src={tournament.logo_url}
                  alt={tournament.title || "Tournament"}
                  className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                  style={{
                    width: `clamp(${tournament.hero_logo_size_mobile ?? 120}px, 18vw, ${
                      tournament.hero_logo_size_desktop ?? 200
                    }px)`,
                    height: `clamp(${tournament.hero_logo_size_mobile ?? 120}px, 18vw, ${
                      tournament.hero_logo_size_desktop ?? 200
                    }px)`,
                  }}
                />
              ) : null}

              <h1
                className="mt-4 font-bold leading-tight text-white"
                style={{
                  maxWidth: `${tournament.hero_title_max_width ?? 900}px`,
                  fontSize: `clamp(${tournament.hero_title_font_mobile ?? 32}px, 5vw, ${
                    tournament.hero_title_font_desktop ?? 60
                  }px)`,
                  textAlign:
                    tournament.hero_title_align === "left" ||
                    tournament.hero_title_align === "right"
                      ? tournament.hero_title_align
                      : "center",
                }}
              >
                {tournament.title || "Tournament"}
              </h1>

              <p
                className="mt-4 text-slate-200"
                style={{
                  maxWidth: `${tournament.hero_subtitle_max_width ?? 700}px`,
                  fontSize: `clamp(${tournament.hero_subtitle_font_mobile ?? 16}px, 2vw, ${
                    tournament.hero_subtitle_font_desktop ?? 18
                  }px)`,
                  lineHeight: 1.6,
                  textAlign:
                    tournament.hero_title_align === "left" ||
                    tournament.hero_title_align === "right"
                      ? tournament.hero_title_align
                      : "center",
                }}
              >
                {tournament.overview || "Tournament overview will be updated soon."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroInfo label="Timeline" value={tournament.timeline || "To be announced"} />
              <HeroInfo label="Venue" value={tournament.venue || "Venue update soon"} />
              <HeroInfo label="Format" value={tournament.format || "Tournament"} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/tournaments"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                All Tournaments
              </a>

              <a
                href={primaryLiveLink || tournamentLink}
                target={primaryLiveLink ? "_blank" : undefined}
                rel={primaryLiveLink ? "noreferrer" : undefined}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {nextMatch || latestResult ? "Match Center" : "Tournament Info"}
              </a>

              <a
                href={latestNews.length > 0 ? "/news" : tournamentLink}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Latest News
              </a>

              <a
                href="/rankings"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Rankings
              </a>
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Tournament Snapshot</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {formatTournamentStatus(tournament.status)}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <QuickStat label="Tournament" value={tournament.title || "Tournament"} />
              <QuickStat label="Window" value={tournament.timeline || "To be announced"} />
              <QuickStat label="Venue" value={tournament.venue || "Venue update soon"} />
              <QuickStat label="Format" value={tournament.format || "Tournament"} />
            </div>

            <div className="mt-5 rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Live Status
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {nextMatch
                  ? `Next match scheduled: ${
                      nextMatch.title ||
                      `${getTeamNameById(nextMatch.team_a_id, tournamentTeams) || "Team A"} vs ${
                        getTeamNameById(nextMatch.team_b_id, tournamentTeams) || "Team B"
                      }`
                    }`
                  : latestResult
                  ? `Latest result: ${latestResult.result_summary || "Completed match available."}`
                  : "Tournament updates will appear here as soon as matches and news are published."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="text-lg font-bold">Live Tournament Blocks</h3>
              <div className="mt-4 space-y-4">
                {loadingLiveBlocks ? (
                  <EmptyCard text="Loading live tournament updates..." />
                ) : (
                  <>
                    <div className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900">Next Match</p>
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Upcoming
                        </span>
                      </div>

                      {nextMatch ? (
                        <>
                          <p className="text-sm font-semibold text-slate-900">
                            {nextMatch.title ||
                              `${getTeamNameById(nextMatch.team_a_id, tournamentTeams) || "Team A"} vs ${
                                getTeamNameById(nextMatch.team_b_id, tournamentTeams) || "Team B"
                              }`}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatMatchDateTime(nextMatch.match_datetime)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Venue: {nextMatch.venue || "Venue update soon"}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">No upcoming match added yet.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900">Latest Result</p>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Completed
                        </span>
                      </div>

                      {latestResult ? (
                        <>
                          <p className="text-sm font-semibold text-slate-900">
                            {latestResult.title ||
                              `${getTeamNameById(latestResult.team_a_id, tournamentTeams) || "Team A"} vs ${
                                getTeamNameById(latestResult.team_b_id, tournamentTeams) || "Team B"
                              }`}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {latestResult.result_summary || "Result summary not updated"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Player of the Match: {latestResult.player_of_match || "Not updated"}
                          </p>

                          {latestResult.scorecard_pdf_url ? (
                            <a
                              href={latestResult.scorecard_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              View Scorecard PDF
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">No completed match result yet.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold">Participating Teams</h3>
              <div className="mt-4">
                {loadingTournamentTeams ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-200 px-4 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-slate-100" />
                          <div className="min-w-0 flex-1">
                            <div className="h-4 w-32 rounded bg-slate-100" />
                            <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : tournamentTeams.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tournamentTeams.map((team) => (
                      <a
                        key={team.id}
                        href={team.slug ? `/teams/${team.slug}` : "/teams"}
                        className="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name || "Team"}
                              className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                              {(team.name || "T").charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {team.name || "Unnamed Team"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {team.badge || "Tournament Team"}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyCard text="Participating teams will appear here once linked." />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Rankings Preview
                </p>
                <h2 className="mt-1 text-2xl font-bold">Top Teams</h2>
              </div>
              <a href="/rankings" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                Full Rankings →
              </a>
            </div>

            <div className="space-y-3">
              {loadingRankings ? (
                [1, 2, 3].map((item) => <SkeletonRank key={item} />)
              ) : teamRankings.length > 0 ? (
                teamRankings.slice(0, 3).map((row) => {
                  const team = getTeam(row);
                  return (
                    <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {row.rank_position ?? "-"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{team?.name || "Unknown Team"}</p>
                          <p className="text-sm text-slate-500">{row.season_label || "Official Ranking"}</p>
                        </div>
                      </div>
                      <p className="ml-3 text-base font-bold text-emerald-700">
                        {row.points ?? row.rating ?? "-"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <EmptyCard text="Team rankings will appear here once data is available." />
              )}
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Rankings Preview
                </p>
                <h2 className="mt-1 text-2xl font-bold">Top Players</h2>
              </div>
              <a href="/rankings" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                Full Rankings →
              </a>
            </div>

            <div className="space-y-3">
              {loadingRankings ? (
                [1, 2, 3].map((item) => <SkeletonRank key={item} />)
              ) : playerRankings.length > 0 ? (
                playerRankings.slice(0, 3).map((row) => {
                  const player = getPlayer(row);
                  return (
                    <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {row.rank_position ?? "-"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{getPlayerName(player)}</p>
                          <p className="text-sm text-slate-500">{row.category || "Overall Ranking"}</p>
                        </div>
                      </div>
                      <p className="ml-3 text-base font-bold text-emerald-700">
                        {row.rating ?? "-"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <EmptyCard text="Player rankings will appear here once data is available." />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Match Timeline
            </p>
            <h2 className="mt-1 text-2xl font-bold">Upcoming & Recent Matches</h2>

            <div className="mt-5 space-y-4">
              {loadingLiveBlocks ? (
                <EmptyCard text="Loading matches..." />
              ) : recentMatches.length > 0 ? (
                recentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl border border-slate-200 px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {match.title ||
                            `${getTeamNameById(match.team_a_id, tournamentTeams) || "Team A"} vs ${
                              getTeamNameById(match.team_b_id, tournamentTeams) || "Team B"
                            }`}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatMatchDateTime(match.match_datetime)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {match.result_summary || match.venue || "Match update soon"}
                        </p>
                      </div>

                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {(match.status || "upcoming").toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyCard text="Matches will appear here once added." />
              )}
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              News Desk
            </p>
            <h2 className="mt-1 text-2xl font-bold">Latest Tournament News</h2>

            <div className="mt-5 space-y-4">
              {loadingLiveBlocks ? (
                <EmptyCard text="Loading news..." />
              ) : latestNews.length > 0 ? (
                latestNews.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 px-4 py-4"
                  >
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.body || "News update"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyCard text="Latest tournament news will appear here once published." />
              )}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function HeroInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

function SkeletonRank() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100" />
        <div>
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-4 w-12 rounded bg-slate-100" />
    </div>
  );
}