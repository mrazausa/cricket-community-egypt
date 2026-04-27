"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  hero_youtube_url?: string | null;
  hero_youtube_autoplay?: boolean | null;
  hero_banner_url?: string | null;
  hero_media_mode?: string | null;
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
  match_number: number | null;
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


type TournamentTopPerformerRow = {
  id: string;
  tournament_id: string;
  player_name: string | null;
  team_name: string | null;
  award_category: string | null;
  stat_line: string | null;
  rating: number | null;
  rank: number | null;
  sort_order: number | null;
  is_active: boolean | null;
  show_on_tournament_page: boolean | null;
};

type TournamentPointsRow = {
  id: string;
  tournament_id: string;
  group_name: string;
  team_name: string;
  team_logo_url: string | null;
  matches_played: number | null;
  wins: number | null;
  losses: number | null;
  points: number | null;
  nrr: number | null;
  sort_order: number | null;
  is_active: boolean | null;
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
  if (Number.isNaN(d.getTime())) return value || "Date not announced";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMatchDateLabel(value: string | null | undefined) {
  if (!value) return "Date to be announced";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date to be announced";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getMatchPrimaryLink(match: MatchRow | null) {
  if (!match) return "";
  return match.external_score_url || match.scorecard_pdf_url || "";
}

function normalizeTitle(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function buildSafeMatchTitle(match: MatchRow, teams: TeamInfo[]) {
  const teamA = getTeamNameById(match.team_a_id, teams);
  const teamB = getTeamNameById(match.team_b_id, teams);

  if (teamA && teamB) {
    return `${teamA} vs ${teamB}`;
  }

  const title = normalizeTitle(match.title);
  if (!title) return "Match";

  const versusMatch = title.match(/([A-Za-z0-9 .&'-]+)\s+vs\s+([A-Za-z0-9 .&'-]+)/i);
  if (versusMatch) {
    return `${versusMatch[1].trim()} vs ${versusMatch[2].trim()}`;
  }

  return title;
}

function getYoutubeEmbedUrl(url?: string | null, autoplay = false) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    let videoId = parsed.searchParams.get("v") || "";

    if (!videoId && parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "").split("/")[0] || "";
    }

    if (!videoId && parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
    }

    if (!videoId && parsed.pathname.includes("/shorts/")) {
      videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    }

    if (!videoId && parsed.pathname.includes("/live/")) {
      videoId = parsed.pathname.split("/live/")[1]?.split("/")[0] || "";
    }

    if (!videoId) return "";

    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
    });

    if (autoplay) {
      params.set("autoplay", "1");
      params.set("mute", "1");
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  } catch {
    return "";
  }
}

function buildTournamentAnnouncements({
  nextMatch,
  latestResult,
  latestNews,
  topPerformers,
  teams,
}: {
  nextMatch: MatchRow | null;
  latestResult: MatchRow | null;
  latestNews: NewsRow[];
  topPerformers: TournamentTopPerformerRow[];
  teams: TeamInfo[];
}) {
  const items: { eyebrow: string; title: string; body: string; href?: string }[] = [];

  if (latestResult) {
    items.push({
      eyebrow: "Latest Result",
      title: buildSafeMatchTitle(latestResult, teams),
      body: latestResult.result_summary || "Completed match result updated.",
      href: getMatchPrimaryLink(latestResult) || undefined,
    });

    if (latestResult.player_of_match) {
      items.push({
        eyebrow: "Man of the Match",
        title: latestResult.player_of_match,
        body: buildSafeMatchTitle(latestResult, teams),
        href: getMatchPrimaryLink(latestResult) || undefined,
      });
    }
  }

  if (nextMatch) {
    items.push({
      eyebrow: "Upcoming Match",
      title: buildSafeMatchTitle(nextMatch, teams),
      body: `${formatMatchDateTime(nextMatch.match_datetime)} • ${nextMatch.venue || "Venue update soon"}`,
    });
  }

  topPerformers.slice(0, 3).forEach((row) => {
    items.push({
      eyebrow: row.award_category || "Top Performer",
      title: row.player_name || "Tournament Performer",
      body: row.stat_line || (row.rating ? `Rating ${row.rating}` : row.team_name || "Tournament performer"),
    });
  });

  latestNews.slice(0, 3).forEach((item) => {
    items.push({
      eyebrow: item.is_featured ? "Featured News" : "News Update",
      title: item.title,
      body: item.body || "Tournament news update.",
    });
  });

  return items.length > 0
    ? items
    : [
        {
          eyebrow: "Tournament Update",
          title: "Updates coming soon",
          body: "Announcements, results and top performers will appear here.",
        },
      ];
}

function normalizeAwardCategory(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function performerCategoryKey(row: TournamentTopPerformerRow) {
  const label = normalizeAwardCategory(row.award_category);

  if (label.includes("batsman") || label.includes("batting") || label.includes("run")) {
    return "batsman";
  }

  if (label.includes("bowler") || label.includes("bowling") || label.includes("wicket")) {
    return "bowler";
  }

  if (label.includes("mvp") || label.includes("best player") || label.includes("all round") || label.includes("allround")) {
    return "mvp";
  }

  return "other";
}

function sortPerformers(a: TournamentTopPerformerRow, b: TournamentTopPerformerRow) {
  const ar = a.rank ?? 999;
  const br = b.rank ?? 999;
  if (ar !== br) return ar - br;

  const as = a.sort_order ?? 999;
  const bs = b.sort_order ?? 999;
  if (as !== bs) return as - bs;

  return (b.rating ?? 0) - (a.rating ?? 0);
}

function getPerformerGroups(rows: TournamentTopPerformerRow[]) {
  const mvp: TournamentTopPerformerRow[] = [];
  const batsman: TournamentTopPerformerRow[] = [];
  const bowler: TournamentTopPerformerRow[] = [];

  rows.forEach((row) => {
    const key = performerCategoryKey(row);
    if (key === "batsman") batsman.push(row);
    else if (key === "bowler") bowler.push(row);
    else if (key === "mvp") mvp.push(row);
  });

  return [
    {
      key: "mvp",
      eyebrow: "Best Player / MVP",
      title: "MVP Race",
      description: "Overall tournament impact from batting, bowling and fielding contribution.",
      rows: mvp.sort(sortPerformers).slice(0, 3),
    },
    {
      key: "batsman",
      eyebrow: "Best Batsman",
      title: "Batting Leaders",
      description: "Top batting performances based on runs, average and strike rate.",
      rows: batsman.sort(sortPerformers).slice(0, 3),
    },
    {
      key: "bowler",
      eyebrow: "Best Bowler",
      title: "Bowling Leaders",
      description: "Top bowling performances based on wickets and bowling impact.",
      rows: bowler.sort(sortPerformers).slice(0, 3),
    },
  ];
}

function PerformerPodium({
  group,
}: {
  group: ReturnType<typeof getPerformerGroups>[number];
}) {
  const leader = group.rows[0] || null;
  const race = group.rows.slice(1, 3);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            {group.eyebrow}
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{group.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {group.description}
          </p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
          Top 3
        </span>
      </div>

      {leader ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-slate-950 via-[#08183f] to-emerald-800 p-5 text-white shadow-xl">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-amber-300 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950">
                  Rank 1 Leader
                </span>
                <span className="text-4xl font-black text-white/20">#1</span>
              </div>

              <h4 className="mt-5 text-3xl font-black leading-tight">
                {leader.player_name || "Tournament Performer"}
              </h4>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-emerald-100">
                {leader.team_name || "Team not set"}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                    Rating / MVP
                  </p>
                  <p className="mt-2 text-2xl font-black">{leader.rating ?? "-"}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                    Stat
                  </p>
                  <p className="mt-2 text-base font-bold leading-6">{leader.stat_line || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              In the race
            </p>
            {race.length > 0 ? (
              race.map((row, index) => (
                <PerformerRaceCard key={row.id} row={row} fallbackRank={index + 2} />
              ))
            ) : (
              <EmptyCard text="Rank 2 and Rank 3 will appear here once updated." />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyCard text={group.eyebrow + " will appear here once imported or enabled from admin."} />
        </div>
      )}
    </div>
  );
}

function PerformerRaceCard({
  row,
  fallbackRank,
}: {
  row: TournamentTopPerformerRow;
  fallbackRank: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Rank {row.rank ?? fallbackRank}
          </p>
          <h4 className="mt-2 truncate text-xl font-black text-slate-950">
            {row.player_name || "Tournament Performer"}
          </h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            {row.team_name || "Team not set"}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Rating</p>
          <p className="text-base font-black text-slate-950">{row.rating ?? "-"}</p>
        </div>
      </div>
      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold leading-6 text-slate-800 ring-1 ring-slate-100">
        {row.stat_line || "Stats not set"}
      </p>
    </div>
  );
}

export default function PublicTournamentPage() {
  const searchParams = useSearchParams();
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
  const [topPerformers, setTopPerformers] = useState<TournamentTopPerformerRow[]>([]);
  const [tournamentPoints, setTournamentPoints] = useState<TournamentPointsRow[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [loadingPointsTable, setLoadingPointsTable] = useState(true);

  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (!slug) return;
    loadTournamentBySlug(slug);
  }, [slug]);

  useEffect(() => {
    if (!tournament?.id) return;
    loadTournamentTeams(tournament.id);
    loadLiveBlocks(tournament.id);
    loadRankings(tournament.id);
    loadTournamentPointsTable(tournament.id);
  }, [tournament?.id]);

  useEffect(() => {
    if (loadingTournament) return;
    const section = searchParams.get("section");
    if (!section) return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(section);
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchParams, loadingTournament, tournament?.id, recentMatches.length, tournamentPoints.length]);

  async function loadTournamentBySlug(inputSlug: string) {
    setLoadingTournament(true);
    setPageError("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", inputSlug)
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
    const teamIds = Array.from(
      new Set(linkRows.map((item) => item.team_id).filter(Boolean))
    );

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
          .order("match_number", { ascending: true, nullsFirst: false })
          .order("match_datetime", { ascending: true })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .eq("status", "completed")
          .order("match_number", { ascending: false, nullsFirst: false })
          .order("match_datetime", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("match_number", { ascending: true, nullsFirst: false })
          .order("match_datetime", { ascending: true })
          .limit(20),

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

  async function loadTournamentPointsTable(tournamentId: string) {
    setLoadingPointsTable(true);

    const { data, error } = await supabase
      .from("tournament_points_table")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .order("group_name", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      setTournamentPoints([]);
      setLoadingPointsTable(false);
      return;
    }

    setTournamentPoints((data || []) as TournamentPointsRow[]);
    setLoadingPointsTable(false);
  }

  async function loadRankings(tournamentId: string) {
    setLoadingRankings(true);

    const [teamRankingsRes, topPerformersRes] = await Promise.all([
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
        .limit(6),

      supabase
        .from("tournament_top_performers")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("is_active", true)
        .eq("show_on_tournament_page", true)
        .order("sort_order", { ascending: true })
        .order("rank", { ascending: true })
        .limit(12),
    ]);

    setTeamRankings((teamRankingsRes.data || []) as TeamRankingRow[]);

    if (topPerformersRes.error) {
      console.error(topPerformersRes.error);
      setTopPerformers([]);
    } else {
      setTopPerformers((topPerformersRes.data || []) as TournamentTopPerformerRow[]);
    }

    setLoadingRankings(false);
  }

  const tournamentHomeLink = useMemo(() => {
    return tournament?.slug ? `/tournaments/${tournament.slug}` : "/tournaments";
  }, [tournament?.slug]);

  const scheduleGroups = useMemo(() => {
    const sorted = [...recentMatches].sort((a, b) => {
      const am = a.match_number ?? 9999;
      const bm = b.match_number ?? 9999;
      if (am !== bm) return am - bm;

      const ad = a.match_datetime ? new Date(a.match_datetime).getTime() : 0;
      const bd = b.match_datetime ? new Date(b.match_datetime).getTime() : 0;
      return ad - bd;
    });

    const map = new Map<string, MatchRow[]>();
    sorted.forEach((match) => {
      const key = formatMatchDateLabel(match.match_datetime);
      map.set(key, [...(map.get(key) || []), match]);
    });

    return Array.from(map.entries()).map(([dateLabel, matches]) => ({ dateLabel, matches }));
  }, [recentMatches]);

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

  const tournamentAnnouncements = buildTournamentAnnouncements({
    nextMatch,
    latestResult,
    latestNews,
    topPerformers,
    teams: tournamentTeams,
  });

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <SiteHeader />
      <style jsx global>{`
        @keyframes tournamentTicker {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-[#02103a] to-emerald-900 p-6 text-white shadow-2xl sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Tournament Center
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                {formatTournamentStatus(tournament.status)}
              </span>
            </div>

            <div
              className={`mt-6 flex flex-col ${getHeroAlignClass(
                tournament.hero_title_align
              )}`}
              style={{ marginTop: `${tournament.hero_logo_top_margin ?? 10}px` }}
            >
              <TournamentHeroMedia tournament={tournament} />

              <h1
                className="mt-5 font-bold leading-tight text-white"
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
                  maxWidth: `${tournament.hero_subtitle_max_width ?? 720}px`,
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

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#schedule"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Schedule
              </a>
              <a
                href="#standings"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Standings & Leaders
              </a>
              <a
                href="#teams"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Teams
              </a>
              <a
                href="#news"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                News
              </a>
            </div>
          </div>

          <div className="rounded-[34px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Tournament Updates</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {formatTournamentStatus(tournament.status)}
              </span>
            </div>

            <div className="mt-5 max-h-[560px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-3 animate-[tournamentTicker_18s_linear_infinite] hover:[animation-play-state:paused]">
                {[...tournamentAnnouncements, ...tournamentAnnouncements].map((item, index) => (
                  <div key={`${item.eyebrow}-${index}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-2 text-lg font-extrabold leading-tight text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-bold text-white"
                      >
                        Open Details
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-[30px] bg-white px-5 py-4 shadow-xl ring-1 ring-slate-200 sm:px-6">
          <div className="flex flex-wrap gap-3">
            <SectionChip href="#overview" label="Overview" />
            <SectionChip href="#schedule" label="Matches" />
            <SectionChip href="#standings" label="Standings" />
            <SectionChip href="#performers" label="Top Performers" />
            <SectionChip href="#teams" label="Teams" />
            <SectionChip href="#news" label="News" />
            <SectionChip href="/tournaments" label="All Tournaments" />
          </div>
        </div>
      </section>

      <section
        id="schedule"
        className="scroll-mt-32 mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8"
      >
        <div className="rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="Schedule / Fixtures"
              title="Match Schedule & Results"
              description="Date-wise fixtures and completed results for this tournament. Controlled from Admin → Matches."
            />
            <div className="flex flex-wrap gap-2">
              <a href="#schedule" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">All</a>
              <a href="#schedule" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Upcoming</a>
              <a href="#schedule" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Completed</a>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            {loadingLiveBlocks ? (
              [1, 2, 3].map((item) => <ScheduleSkeleton key={item} />)
            ) : scheduleGroups.length > 0 ? (
              scheduleGroups.map((group) => (
                <div key={group.dateLabel} className="overflow-hidden rounded-3xl border border-slate-200">
                  <div className="bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">{group.dateLabel}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.matches.map((match) => (
                      <ScheduleMatchCard key={match.id} match={match} teams={tournamentTeams} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyCard text="Matches will appear here once added from admin." />
            )}
          </div>
        </div>
      </section>

      <section id="teams" className="scroll-mt-28 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <SectionHeader
            eyebrow="Tournament Teams"
            title="Participating Teams"
            description="Browse the teams currently linked to this tournament. Controlled from Admin → Tournament Teams."
          />
          <div className="mt-5">
            {loadingTournamentTeams ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => <TeamSkeleton key={item} />)}
              </div>
            ) : tournamentTeams.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {tournamentTeams.map((team) => (
                  <a key={team.id} href={team.slug ? `/teams/${team.slug}` : "/teams"} className="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name || "Team"} className="h-14 w-14 rounded-full bg-white object-contain p-1 ring-1 ring-slate-200" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{(team.name || "T").charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{team.name || "Unnamed Team"}</p>
                        <p className="text-sm text-slate-500">{team.badge || "Tournament Team"}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyCard text="Participating teams will appear here once linked from admin." />
            )}
          </div>
        </div>
      </section>

      <section id="points-table" className="scroll-mt-28 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <SectionHeader eyebrow="Points Table" title="Tournament Standings" description="Group-wise standings controlled from Admin → Tournament Teams." />
          <div className="mt-5">
            {loadingPointsTable ? (
              <EmptyCard text="Loading points table..." />
            ) : tournamentPoints.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {Array.from(new Set(tournamentPoints.map((row) => row.group_name || "Group"))).map((group) => {
                  const rows = tournamentPoints.filter((row) => (row.group_name || "Group") === group);
                  return (
                    <div key={group} className="overflow-hidden rounded-3xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><p className="text-lg font-bold text-slate-900">{group}</p></div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead><tr className="border-b border-slate-200 bg-white text-left">
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Team</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">M</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">W</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">L</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">P</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">NRR</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-4 py-4"><div className="flex items-center gap-3">
                                  {row.team_logo_url ? <img src={row.team_logo_url} alt={row.team_name} className="h-10 w-10 rounded-full bg-white object-contain p-1 ring-1 ring-slate-200" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{(row.team_name || "T").charAt(0)}</div>}
                                  <span className="font-bold text-slate-900">{row.team_name}</span>
                                </div></td>
                                <td className="px-3 py-4 text-center text-sm font-semibold text-slate-700">{row.matches_played ?? 0}</td>
                                <td className="px-3 py-4 text-center text-sm font-semibold text-slate-700">{row.wins ?? 0}</td>
                                <td className="px-3 py-4 text-center text-sm font-semibold text-slate-700">{row.losses ?? 0}</td>
                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-900">{row.points ?? 0}</td>
                                <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">{typeof row.nrr === "number" ? row.nrr.toFixed(2) : "0.00"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyCard text="Points table will appear here once standings are added from admin." />
            )}
          </div>
        </div>
      </section>

      <section id="performers" className="scroll-mt-28 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <SectionHeader
            eyebrow="Leaders"
            title="Top Performers"
            description="Tournament leaders and award race preview. Rank 1 is highlighted, while Rank 2 and Rank 3 remain in the race. Controlled from Admin → Tournament Design."
          />

          <div className="mt-6 space-y-5">
            {loadingRankings ? (
              ["MVP Race", "Batting Leaders", "Bowling Leaders"].map((item) => (
                <div key={item} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">{item}</p>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <EmptyCard text="Loading leader..." />
                    <EmptyCard text="Loading race positions..." />
                  </div>
                </div>
              ))
            ) : topPerformers.length > 0 ? (
              getPerformerGroups(topPerformers).map((group) => (
                <PerformerPodium key={group.key} group={group} />
              ))
            ) : (
              <EmptyCard text="Top performers will appear here once player rankings are added." />
            )}
          </div>
        </div>
      </section>
      <section
        id="news"
        className="scroll-mt-28 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8"
      >
        <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <SectionHeader
            eyebrow="News Desk"
            title="Latest Tournament News"
            description="Tournament-specific news, announcements, and update notes."
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {loadingLiveBlocks ? (
              [1, 2].map((item) => <EmptyCard key={item} text="Loading news..." />)
            ) : latestNews.length > 0 ? (
              latestNews.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 px-4 py-4"
                >
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.body || "News update"}
                  </p>
                </div>
              ))
            ) : (
              <div className="lg:col-span-2">
                <EmptyCard text="Latest tournament news will appear here once published." />
              </div>
            )}
          </div>

          <div className="mt-6">
            <a
              href="/tournaments"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to All Tournaments
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}


function TournamentHeroMedia({ tournament }: { tournament: TournamentRow }) {
  const youtubeUrl = getYoutubeEmbedUrl(
    tournament.hero_youtube_url,
    tournament.hero_youtube_autoplay === true
  );
  const bannerUrl = tournament.hero_banner_url || tournament.logo_url || "";

  if (youtubeUrl) {
    return (
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
        <iframe
          src={youtubeUrl}
          title={tournament.title || "Tournament video"}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (bannerUrl) {
    return (
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl">
        <img
          src={bannerUrl}
          alt={tournament.title || "Tournament"}
          className="mx-auto max-h-[280px] w-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        />
      </div>
    );
  }

  return null;
}
function getMatchDisplayNumber(match: MatchRow) {
  return match.match_number && match.match_number > 0 ? `Match ${match.match_number}` : "Match";
}

function ScheduleMatchCard({ match, teams }: { match: MatchRow; teams: TeamInfo[] }) {
  const isCompleted = (match.status || "").toLowerCase() === "completed";
  const isLive = (match.status || "").toLowerCase() === "live";
  const primaryLink = getMatchPrimaryLink(match);

  return (
    <div className="grid gap-4 px-4 py-5 lg:grid-cols-[1.2fr_0.7fr_0.9fr] lg:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white">
            {getMatchDisplayNumber(match)}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
              isCompleted
                ? "bg-slate-100 text-slate-700"
                : isLive
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isCompleted ? "Result" : isLive ? "Live" : "Upcoming"}
          </span>
          {match.key_players ? (
            <span className="text-xs font-semibold text-slate-500">{match.key_players}</span>
          ) : null}
        </div>

        <p className="text-lg font-extrabold text-slate-950">
          {buildSafeMatchTitle(match, teams)}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {formatMatchDateTime(match.match_datetime)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Venue: {match.venue || "Venue update soon"}
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Match Status
        </p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {(match.status || "upcoming").toUpperCase()}
        </p>
        {isCompleted ? (
          <p className="mt-2 text-sm text-slate-700">
            {match.result_summary || "Result summary pending"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
        {isCompleted && match.player_of_match ? (
          <div className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-left ring-1 ring-amber-100 lg:max-w-[240px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">POTM</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{match.player_of_match}</p>
          </div>
        ) : null}

        {primaryLink ? (
          <a
            href={primaryLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {match.scorecard_pdf_url ? "View Scorecard" : "Open Score"}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SectionChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-full bg-slate-50 px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
    >
      {label}
    </a>
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

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MatchSummaryCard({
  title,
  badge,
  match,
  teams,
  emptyText,
  showResult,
}: {
  title: string;
  badge: string;
  match: MatchRow | null;
  teams: TeamInfo[];
  emptyText: string;
  showResult: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {badge}
        </span>
      </div>

      {match ? (
        <>
          <p className="text-sm font-semibold text-slate-900">
            {buildSafeMatchTitle(match, teams)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatMatchDateTime(match.match_datetime)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Venue: {match.venue || "Venue update soon"}
          </p>

          {showResult ? (
            <>
              <p className="mt-2 text-sm text-slate-700">
                {match.result_summary || "Result summary not updated"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Player of the Match: {match.player_of_match || "Not updated"}
              </p>

              {match.scorecard_pdf_url ? (
                <a
                  href={match.scorecard_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  View Scorecard PDF
                </a>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
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

function TeamSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-100" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}