"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  timeline?: string | null;
  overview?: string | null;
  logo_url?: string | null;
  venue?: string | null;
  format?: string | null;
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
  hero_subtitle_top_margin?: number | null;
  hero_buttons_top_margin?: number | null;
  hero_min_height_desktop?: number | null;
  [key: string]: any;
};

type HomepageSettingsRow = {
  id?: string;

  hero_content_mode?: string | null;
  hero_custom_badge?: string | null;
  hero_custom_title?: string | null;
  hero_custom_subtitle?: string | null;
  hero_custom_image_url?: string | null;
  hero_custom_cta_text?: string | null;
  hero_custom_cta_link?: string | null;
  hero_custom_meta_1_label?: string | null;
  hero_custom_meta_1_value?: string | null;
  hero_custom_meta_2_label?: string | null;
  hero_custom_meta_2_value?: string | null;
  hero_custom_meta_3_label?: string | null;
  hero_custom_meta_3_value?: string | null;

  hero_youtube_url?: string | null;
  hero_youtube_autoplay?: boolean | null;
  hero_banner_url?: string | null;

  hero_badge?: string | null;
  hero_launch_note_title?: string | null;
  hero_launch_note_text?: string | null;
  featured_section_eyebrow?: string | null;
  featured_section_title?: string | null;
  featured_section_subtitle?: string | null;
  rankings_teams_title?: string | null;
  rankings_players_title?: string | null;
  players_watch_eyebrow?: string | null;
  players_watch_title?: string | null;
  quick_links_eyebrow?: string | null;
  quick_links_title?: string | null;

  show_hero?: boolean | null;
  show_featured_section?: boolean | null;
  show_rankings?: boolean | null;
  show_players_watch?: boolean | null;
  show_quick_links?: boolean | null;

  hero_order?: number | null;
  featured_section_order?: number | null;
  rankings_order?: number | null;
  players_watch_order?: number | null;
  quick_links_order?: number | null;
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
  rating: number | null;
  season_label: string | null;
  team_name_override?: string | null;
  team_logo_override_url?: string | null;
  teams?: TeamInfo | TeamInfo[] | null;
};

type PlayerRankingRow = {
  id: string;
  player_id: string | null;
  rank_position: number | null;
  category: string | null;
  rating: number | null;
  player_name_override?: string | null;
  player_photo_override_url?: string | null;
  players?: PlayerInfo | PlayerInfo[] | null;
};

type HomepagePlayerWatch = {
  id: string;
  sort_order: number;
  player_name: string;
  team_name: string;
  tag: string;
  note: string;
  is_active: boolean;
};

type HomepageQuickLink = {
  id: string;
  sort_order: number;
  title: string;
  subtitle: string;
  href: string;
  is_active: boolean;
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

type HomepageFeaturedVisualRow = {
  id: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  info_1_label: string | null;
  info_1_value: string | null;
  info_2_label: string | null;
  info_2_value: string | null;
  info_3_label: string | null;
  info_3_value: string | null;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean | null;
};

type HomepageCommunityCard = {
  id: string;
  sort_order: number | null;
  section_type: "leadership" | "advisory" | "member" | string;
  badge: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  href: string | null;
  is_active: boolean | null;
};

const fallbackTournament: TournamentRow = {
  id: "fallback-home",
  title: "Premium Cricket Platform",
  slug: "tournaments",
  status: "featured",
  timeline: "Season update coming soon",
  overview:
    "Explore featured tournaments, rankings, teams, players, and major cricket activity across Egypt.",
  logo_url: null,
  venue: "Egypt",
  format: "Tournament",
  is_featured_home: false,
  hero_title_font_mobile: 32,
  hero_title_font_desktop: 60,
  hero_title_max_width: 900,
  hero_title_align: "center",
  hero_logo_size_mobile: 120,
  hero_logo_size_desktop: 200,
  hero_logo_top_margin: 10,
  hero_subtitle_font_mobile: 16,
  hero_subtitle_font_desktop: 18,
  hero_subtitle_max_width: 700,
  hero_subtitle_top_margin: 16,
  hero_buttons_top_margin: 24,
  hero_min_height_desktop: 520,
};

const fallbackHomepageSettings: HomepageSettingsRow = {
  hero_content_mode: "featured_tournament",
  hero_custom_badge: "Main Highlight",
  hero_custom_title: "",
  hero_custom_subtitle: "",
  hero_custom_image_url: "",
  hero_custom_cta_text: "Explore Now",
  hero_custom_cta_link: "/news",
  hero_custom_meta_1_label: "Highlight",
  hero_custom_meta_1_value: "",
  hero_custom_meta_2_label: "Date",
  hero_custom_meta_2_value: "",
  hero_custom_meta_3_label: "Venue",
  hero_custom_meta_3_value: "",

  hero_badge: "Main Highlight",
  hero_launch_note_title: "Official Launch Note",
  hero_launch_note_text:
    "Homepage hero is now dynamic. Admin can switch the featured tournament directly from the dashboard without changing code.",
  featured_section_eyebrow: "Featured Tournament",
  featured_section_title: "Featured Tournament",
  featured_section_subtitle:
  "Quick match highlights here. Open the tournament page for standings, statistics, teams, and full tournament details.",
  rankings_teams_title: "Top Teams",
  rankings_players_title: "Top Players",
  players_watch_eyebrow: "Tournament Watchlist",
  players_watch_title: "Players to Watch",
  quick_links_eyebrow: "Quick Navigation",
  quick_links_title: "Explore the Platform",

  show_hero: true,
  show_featured_section: true,
  show_rankings: true,
  show_players_watch: true,
  show_quick_links: true,

  hero_order: 1,
  featured_section_order: 2,
  rankings_order: 3,
  players_watch_order: 4,
  quick_links_order: 6,
};

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

function formatTournamentStatus(status: string | null | undefined) {
  if (!status) return "Tournament";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getTeamNameById(teamId: string | null | undefined, teams: TeamInfo[]) {
  if (!teamId) return null;
  const team = teams.find((item) => item.id === teamId);
  return team?.name || null;
}

function normalizeMatchTitle(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function buildHomepageMatchTitle(
  match: {
    title?: string | null;
    team_a_id?: string | null;
    team_b_id?: string | null;
  } | null,
  teams: Array<{ id: string; name: string | null }>
) {
  if (!match) return "Match";

  const teamA = match.team_a_id
    ? teams.find((item) => item.id === match.team_a_id)?.name
    : null;
  const teamB = match.team_b_id
    ? teams.find((item) => item.id === match.team_b_id)?.name
    : null;

  if (teamA && teamB) {
    return `${teamA} vs ${teamB}`;
  }

  const title = normalizeMatchTitle(match.title);
  if (!title) return "Match";

  const versusMatch = title.match(/([A-Za-z0-9 .&'-]+)\s+vs\s+([A-Za-z0-9 .&'-]+)/i);
  if (versusMatch) {
    return `${versusMatch[1].trim()} vs ${versusMatch[2].trim()}`;
  }

  return title;
}

function formatMatchDateTime(value: string | null | undefined) {
  if (!value) return "Date not announced";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "Date not announced";
  return d.toLocaleString();
}

function getMatchPrimaryLink(match: MatchRow | null) {
  if (!match) return "";
  return match.external_score_url || match.scorecard_pdf_url || "";
}

function getHeroAlignClass(align?: string | null) {
  if (align === "left") return "items-start text-left";
  if (align === "right") return "items-end text-right";
  return "items-center text-center";
}

function getHeroMode(settings: HomepageSettingsRow) {
  return settings.hero_content_mode || "featured_tournament";
}

function getCommunityAccent(sectionType: string) {
  if (sectionType === "leadership") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }
  if (sectionType === "advisory") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
}

function getCommunityFallbackLabel(sectionType: string) {
  if (sectionType === "leadership") return "CCE Leadership";
  if (sectionType === "advisory") return "Advisory Body";
  return "CCE Members";
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [homepageSettings, setHomepageSettings] =
    useState<HomepageSettingsRow>(fallbackHomepageSettings);
  const [playersWatch, setPlayersWatch] = useState<HomepagePlayerWatch[]>([]);
  const [quickLinks, setQuickLinks] = useState<HomepageQuickLink[]>([]);
  const [communityCards, setCommunityCards] = useState<HomepageCommunityCard[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<TeamInfo[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRankingRow[]>([]);
  const [playerRankings, setPlayerRankings] = useState<PlayerRankingRow[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchRow[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchRow[]>([]);
  const [latestNews, setLatestNews] = useState<NewsRow[]>([]);
  const [loadingLiveBlocks, setLoadingLiveBlocks] = useState(true);
  const [homepageFeaturedVisual, setHomepageFeaturedVisual] =
    useState<HomepageFeaturedVisualRow | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingTournamentTeams, setLoadingTournamentTeams] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  async function loadTournaments() {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setTournaments([]);
      return;
    }

    setTournaments((data || []) as TournamentRow[]);
  }

  async function loadLiveUpdates() {
    const { data } = await supabase
      .from("homepage_live_updates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) setLiveUpdates(data);
  }

  async function loadHomepageSettings() {
    const { data, error } = await supabase
      .from("homepage_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      setHomepageSettings(fallbackHomepageSettings);
      return;
    }

    if (data) {
      setHomepageSettings({
        ...fallbackHomepageSettings,
        ...(data as HomepageSettingsRow),
      });
    } else {
      setHomepageSettings(fallbackHomepageSettings);
    }
  }

  async function loadPhaseContent() {
    const [playersRes, quickLinksRes] = await Promise.all([
      supabase
        .from("homepage_players_watch")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("homepage_quick_links")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (!playersRes.error) {
      setPlayersWatch((playersRes.data || []) as HomepagePlayerWatch[]);
    }
    if (!quickLinksRes.error) {
      setQuickLinks((quickLinksRes.data || []) as HomepageQuickLink[]);
    }
  }

  async function loadCommunityCards() {
    const { data, error } = await supabase
      .from("homepage_community_cards")
      .select("*")
      .eq("is_active", true)
      .order("section_type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      setCommunityCards([]);
      return;
    }

    setCommunityCards((data || []) as HomepageCommunityCard[]);
  }

  async function loadTournamentTeams(tournamentId: string) {
    if (!tournamentId || tournamentId === fallbackTournament.id) {
      setTournamentTeams([]);
      setLoadingTournamentTeams(false);
      return;
    }

    setLoadingTournamentTeams(true);

    const { data: links, error: linksError } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id, team_id, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true });

    if (linksError) {
      console.error(linksError);
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
      console.error(teamsError);
      setTournamentTeams([]);
      setLoadingTournamentTeams(false);
      return;
    }

    const teamsMap = new Map(
      ((teamsData || []) as TeamInfo[]).map((team) => [team.id, team])
    );

    const orderedTeams = linkRows
      .map((link) => teamsMap.get(link.team_id))
      .filter(Boolean) as TeamInfo[];

    setTournamentTeams(orderedTeams);
    setLoadingTournamentTeams(false);
  }

  async function loadLiveBlocks(tournamentId: string) {
    if (!tournamentId || tournamentId === fallbackTournament.id) {
      setUpcomingMatches([]);
      setCompletedMatches([]);
      setLatestNews([]);
      setLoadingLiveBlocks(false);
      return;
    }

    setLoadingLiveBlocks(true);

    const [upcomingRes, completedRes, latestNewsRes] = await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("status", "upcoming")
        .eq("is_featured_home", true)
        .order("sort_order", { ascending: true })
        .order("match_datetime", { ascending: true })
        .limit(8),

      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("status", "completed")
        .eq("is_featured_home", true)
        .order("sort_order", { ascending: true })
        .order("match_datetime", { ascending: false })
        .limit(8),

      supabase
        .from("news")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    setUpcomingMatches(
      !upcomingRes.error ? ((upcomingRes.data || []) as MatchRow[]) : []
    );

    setCompletedMatches(
      !completedRes.error ? ((completedRes.data || []) as MatchRow[]) : []
    );

    if (!latestNewsRes.error) {
      setLatestNews((latestNewsRes.data || []) as NewsRow[]);
    } else {
      setLatestNews([]);
    }

    setLoadingLiveBlocks(false);
  }

  async function loadHomepageFeaturedVisual() {
    const { data, error } = await supabase
      .from("homepage_featured_visuals")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      setHomepageFeaturedVisual(null);
      return;
    }

    setHomepageFeaturedVisual((data as HomepageFeaturedVisualRow | null) || null);
  }

  async function loadTeamRankings() {
    setLoadingTeams(true);
    const { data, error } = await supabase
      .from("team_rankings")
      .select(`
        id,
        team_id,
        rank_position,
        points,
        rating,
        season_label,
        team_name_override,
        team_logo_override_url,
        teams (
          id,
          name,
          slug,
          logo_url,
          badge
        )
      `)
      .order("rank_position", { ascending: true })
      .limit(10);

    if (error) {
      console.error(error);
      setTeamRankings([]);
    } else {
      setTeamRankings((data || []) as TeamRankingRow[]);
    }
    setLoadingTeams(false);
  }

  async function loadPlayerRankings() {
    setLoadingPlayers(true);
    const { data, error } = await supabase
      .from("player_rankings")
      .select(`
        id,
        player_id,
        rank_position,
        category,
        rating,
        player_name_override,
        player_photo_override_url,
        players (*)
      `)
      .order("rank_position", { ascending: true })
      .limit(10);

    if (error) {
      console.error(error);
      setPlayerRankings([]);
    } else {
      setPlayerRankings((data || []) as PlayerRankingRow[]);
    }
    setLoadingPlayers(false);
  }

  useEffect(() => {
    loadTournaments();
    loadHomepageSettings();
    loadPhaseContent();
    loadCommunityCards();
    loadTeamRankings();
    loadPlayerRankings();
    loadHomepageFeaturedVisual();
    loadLiveUpdates();
  }, []);

  const featuredTournament = useMemo(() => {
    const featured = tournaments.find((item) => item.is_featured_home);
    if (featured) return featured;

    const upcoming = tournaments.find(
      (item) => (item.status || "").toLowerCase() === "upcoming"
    );
    if (upcoming) return upcoming;

    if (tournaments.length > 0) return tournaments[0];

    return fallbackTournament;
  }, [tournaments]);

  useEffect(() => {
    loadTournamentTeams(featuredTournament.id);
    loadLiveBlocks(featuredTournament.id);
  }, [featuredTournament.id]);

  useEffect(() => {
    if (liveUpdates.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === liveUpdates.length - 1 ? 0 : prev + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [liveUpdates]);

  useEffect(() => {
    if (currentIndex >= liveUpdates.length && liveUpdates.length > 0) {
      setCurrentIndex(0);
    }
  }, [liveUpdates, currentIndex]);

  const groupedCommunityCards = useMemo(() => {
    const leadership = communityCards
      .filter((item) => item.section_type === "leadership")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const advisory = communityCards
      .filter((item) => item.section_type === "advisory")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const member = communityCards
      .filter((item) => item.section_type === "member")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return [
      leadership[0] || null,
      advisory[0] || null,
      member[0] || null,
    ].filter(Boolean) as HomepageCommunityCard[];
  }, [communityCards]);

  const tournamentLink =
    featuredTournament.slug && featuredTournament.slug !== "tournaments"
      ? `/tournaments/${featuredTournament.slug}`
      : "/tournaments";

  const nextMatchLink =
    upcomingMatches.length > 0 ? getMatchPrimaryLink(upcomingMatches[0]) : "";
  const latestNewsLink = latestNews.length > 0 ? "/news" : "";
  const rankingsLink = "/rankings";
  const heroMode = getHeroMode(homepageSettings);
  const activeLiveUpdate = liveUpdates[currentIndex] || null;
  const heroTitle = getHomepageHeroTitle(
    heroMode,
    homepageSettings,
    featuredTournament,
    latestNews
  );
  const heroSubtitle = getHomepageHeroSubtitle(
    heroMode,
    homepageSettings,
    featuredTournament,
    latestNews
  );
  const heroPrimaryImage = getHomepageHeroImage(
    heroMode,
    homepageSettings,
    featuredTournament,
    latestNews
  );

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <SiteHeader />

      <div className="flex flex-col">
        {homepageSettings.show_hero !== false && (
          <section
            className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
            style={{ order: homepageSettings.hero_order ?? 1 }}
          >
            <div className="grid gap-5 lg:grid-cols-[1.65fr_0.85fr] lg:items-stretch">
              <div className="flex min-h-[560px] flex-col overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#02103a] to-emerald-900 p-6 text-white shadow-2xl sm:p-8 lg:h-[640px] lg:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                    {heroMode === "news_highlight"
                      ? "News Highlight"
                      : homepageSettings.hero_custom_badge ||
                        homepageSettings.hero_badge ||
                        fallbackHomepageSettings.hero_badge}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                    {heroMode === "custom_highlight"
                      ? "Highlight"
                      : formatTournamentStatus(featuredTournament.status)}
                  </span>
                </div>

                <HeroMediaBlock
                  youtubeUrl={homepageSettings.hero_youtube_url || ""}
                  autoplay={homepageSettings.hero_youtube_autoplay === true}
                  imageUrl={heroPrimaryImage}
                  title={heroTitle}
                />

                <div className="mt-auto">
                  <h1
                    className="font-bold leading-tight text-white"
                    style={{
                      maxWidth: `${featuredTournament.hero_title_max_width ?? 900}px`,
                      fontSize: `clamp(${featuredTournament.hero_title_font_mobile ?? 32}px, 5vw, ${featuredTournament.hero_title_font_desktop ?? 60}px)`,
                      whiteSpace: "normal",
                      overflowWrap: "break-word",
                      textAlign:
                        featuredTournament.hero_title_align === "left" ||
                        featuredTournament.hero_title_align === "right"
                          ? featuredTournament.hero_title_align
                          : "center",
                      marginLeft:
                        featuredTournament.hero_title_align === "left" ? 0 : "auto",
                      marginRight:
                        featuredTournament.hero_title_align === "right" ? 0 : "auto",
                    }}
                  >
                    {heroTitle}
                  </h1>

                  <p
                    className="text-slate-200"
                    style={{
                      marginTop: `${featuredTournament.hero_subtitle_top_margin ?? 16}px`,
                      maxWidth: `${featuredTournament.hero_subtitle_max_width ?? 700}px`,
                      fontSize: `clamp(${featuredTournament.hero_subtitle_font_mobile ?? 16}px, 2vw, ${featuredTournament.hero_subtitle_font_desktop ?? 18}px)`,
                      lineHeight: 1.6,
                      textAlign:
                        featuredTournament.hero_title_align === "left" ||
                        featuredTournament.hero_title_align === "right"
                          ? featuredTournament.hero_title_align
                          : "center",
                      marginLeft:
                        featuredTournament.hero_title_align === "left" ? 0 : "auto",
                      marginRight:
                        featuredTournament.hero_title_align === "right" ? 0 : "auto",
                    }}
                  >
                    {heroSubtitle}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <HeroInfo
                      label="Timeline"
                      value={featuredTournament.timeline || "To be announced"}
                    />
                    <HeroInfo
                      label="Venue"
                      value={featuredTournament.venue || "Venue update soon"}
                    />
                    <HeroInfo
                      label="Format"
                      value={featuredTournament.format || "Tournament"}
                    />
                  </div>

                  <div
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    style={{
                      marginTop: `${featuredTournament.hero_buttons_top_margin ?? 24}px`,
                    }}
                  >
                    <a
                      href={tournamentLink}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      View Tournament
                    </a>

                    <a
                      href={nextMatchLink || tournamentLink}
                      target={nextMatchLink ? "_blank" : undefined}
                      rel={nextMatchLink ? "noreferrer" : undefined}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      {upcomingMatches.length > 0 ? "Next Match" : "Match Center"}
                    </a>

                    <a
                      href={latestNewsLink || "/news"}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Latest News
                    </a>

                    <a
                      href={rankingsLink}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Rankings
                    </a>
                  </div>
                </div>
              </div>

              <HomepageLiveUpdatePanel
                activeLiveUpdate={activeLiveUpdate}
                liveUpdates={liveUpdates}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                featuredVisual={homepageFeaturedVisual}
                featuredTournament={featuredTournament}
                homepageSettings={homepageSettings}
              />
            </div>
          </section>
        )}

        {homepageSettings.show_featured_section !== false && (
          <section
            className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12"
            style={{ order: homepageSettings.featured_section_order ?? 2 }}
          >
            <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {homepageSettings.featured_section_eyebrow ||
                      fallbackHomepageSettings.featured_section_eyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    {homepageSettings.featured_section_title ||
                      fallbackHomepageSettings.featured_section_title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {homepageSettings.featured_section_subtitle ||
                      fallbackHomepageSettings.featured_section_subtitle}
                  </p>
                </div>

                <a
                  href={tournamentLink}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Tournament Page
                </a>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div>
                <h3 className="text-lg font-bold">Live Tournament Blocks</h3>

                <div className="mt-4 space-y-5">
                  {loadingLiveBlocks ? (
                    <EmptyCard text="Loading live tournament updates..." />
                  ) : (
                    <>
                      <MatchCarousel
                        title="Upcoming Matches"
                        badge="Upcoming"
                        badgeClass="bg-emerald-100 text-emerald-700"
                        emptyText="No upcoming match added yet."
                        matches={upcomingMatches}
                        teams={tournamentTeams}
                        type="upcoming"
                        tournamentSlug={featuredTournament?.slug || ""}
                      />

                      <MatchCarousel
                        title="Completed Results"
                        badge="Completed"
                        badgeClass="bg-slate-100 text-slate-700"
                        emptyText="No completed match result yet."
                        matches={completedMatches}
                        teams={tournamentTeams}
                        type="completed"
                        tournamentSlug={featuredTournament?.slug || ""}
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
  <h3 className="text-lg font-bold">Tournament Center</h3>
  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <p className="text-sm font-semibold text-slate-900">
      Explore the full tournament page for complete coverage.
    </p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
  <a
    href={
      featuredTournament?.slug
        ? `/tournaments/${featuredTournament.slug}#points-table`
        : "/tournaments"
    }
    className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200 transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-md"
  >
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Standings
    </p>
    <p className="mt-2 text-sm font-semibold text-slate-900">
      Points table and team progress
    </p>
  </a>

  <a
    href={
      featuredTournament?.slug
        ? `/tournaments/${featuredTournament.slug}#schedule`
        : "/tournaments"
    }
    className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200 transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-md"
  >
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Matches
    </p>
    <p className="mt-2 text-sm font-semibold text-slate-900">
      Upcoming fixtures and completed results
    </p>
  </a>

  <a
    href={
      featuredTournament?.slug
        ? `/tournaments/${featuredTournament.slug}#points-table`
        : "/tournaments"
    }
    className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200 transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-md"
  >
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Statistics
    </p>
    <p className="mt-2 text-sm font-semibold text-slate-900">
      Batting, bowling, and MVP race
    </p>
  </a>

  <a
    href={
      featuredTournament?.slug
        ? `/tournaments/${featuredTournament.slug}#teams`
        : "/tournaments"
    }
    className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200 transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-md"
  >
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Teams
    </p>
    <p className="mt-2 text-sm font-semibold text-slate-900">
      Participating squads and tournament news
    </p>
  </a>
</div>

    <div className="mt-5">
      <a
        href={
          featuredTournament?.slug
            ? `/tournaments/${featuredTournament.slug}`
            : "/tournaments"
        }
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Open Tournament Page
      </a>
    </div>
  </div>
</div>
              </div>
            </div>
          </section>
        )}

        {homepageSettings.show_rankings !== false && (
          <section
            className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12"
            style={{ order: homepageSettings.rankings_order ?? 3 }}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      Rankings Preview
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                      {homepageSettings.rankings_teams_title ||
                        fallbackHomepageSettings.rankings_teams_title}
                    </h2>
                  </div>
                  <a
                    href="/rankings"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Full Rankings →
                  </a>
                </div>

                <div className="space-y-3.5">
                  {loadingTeams ? (
                    [1, 2, 3, 4, 5].map((item) => <SkeletonRank key={item} />)
                  ) : teamRankings.length > 0 ? (
                    teamRankings.slice(0, 3).map((row) => {
                      const team = getTeam(row);
                      const teamName =
                        row.team_name_override || team?.name || "Unknown Team";
                      const teamImage =
                        row.team_logo_override_url || team?.logo_url || null;

                      return (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-bold text-white shadow-sm">
                              {row.rank_position ?? "-"}
                            </div>

                            {teamImage ? (
                              <img
                                src={teamImage}
                                alt={teamName}
                                className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                                {teamName.slice(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-slate-900">
                                {teamName}
                              </p>
                              <p className="text-sm text-slate-500">
                                {row.season_label || "Official Ranking"}
                              </p>
                            </div>
                          </div>
                          <p className="ml-4 shrink-0 text-lg font-bold text-emerald-600">
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

              <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      Rankings Preview
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                      {homepageSettings.rankings_players_title ||
                        fallbackHomepageSettings.rankings_players_title}
                    </h2>
                  </div>
                  <a
                    href="/rankings"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Full Rankings →
                  </a>
                </div>

                <div className="space-y-3.5">
                  {loadingPlayers ? (
                    [1, 2, 3, 4, 5].map((item) => <SkeletonRank key={item} />)
                  ) : playerRankings.length > 0 ? (
                    playerRankings.slice(0, 3).map((row) => {
                      const player = getPlayer(row);
                      const basePlayerName = getPlayerName(player);
                      const playerName = row.player_name_override || basePlayerName;
                      const playerImage =
                        row.player_photo_override_url ||
                        player?.image_url ||
                        player?.photo_url ||
                        player?.avatar_url ||
                        player?.profile_image_url ||
                        null;

                      return (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-bold text-white shadow-sm">
                              {row.rank_position ?? "-"}
                            </div>

                            {playerImage ? (
                              <img
                                src={playerImage}
                                alt={playerName}
                                className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                                {playerName.slice(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-slate-900">
                                {playerName}
                              </p>
                              <p className="text-sm text-slate-500">
                                {row.category || "Overall Ranking"}
                              </p>
                            </div>
                          </div>
                          <p className="ml-4 shrink-0 text-lg font-bold text-emerald-600">
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
        )}

        {homepageSettings.show_players_watch !== false && (
          <section
            className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12"
            style={{ order: homepageSettings.players_watch_order ?? 4 }}
          >
            <div className="rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    {homepageSettings.players_watch_eyebrow ||
                      fallbackHomepageSettings.players_watch_eyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    {homepageSettings.players_watch_title ||
                      fallbackHomepageSettings.players_watch_title}
                  </h2>
                </div>
                <a
                  href="/players"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Explore Players
                </a>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {playersWatch.length > 0 ? (
                  playersWatch.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-7"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold">{player.player_name}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {player.team_name}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                          {player.tag}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {player.note}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyDarkCard text="Players to watch will be updated soon." />
                )}
              </div>
            </div>
          </section>
        )}

        <section
          className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12"
          style={{ order: 5 }}
        >
          <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Community Structure
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Leadership, Advisory Body, and Members
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Meet the people shaping Cricket Community Egypt, from leadership
                  and advisory support to the wider member network.
                </p>
              </div>

              <a
                href="/community"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Explore Community
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {groupedCommunityCards.length > 0 ? (
                groupedCommunityCards.map((item) => (
                  <a
                    key={item.id}
                    href={item.href || "/community"}
                    className="group rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getCommunityAccent(
                          item.section_type
                        )}`}
                      >
                        {item.badge || getCommunityFallbackLabel(item.section_type)}
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-slate-900">
                      {item.title || "Community Section"}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {item.subtitle || "Cricket Community Egypt"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.description || "Community details will be updated soon."}
                    </p>

                    <div className="mt-5 inline-flex items-center text-sm font-semibold text-emerald-700 transition group-hover:text-emerald-800">
                      Explore →
                    </div>
                  </a>
                ))
              ) : (
                <>
                  <EmptyCard text="Leadership card will appear here once added from admin." />
                  <EmptyCard text="Advisory Body card will appear here once added from admin." />
                  <EmptyCard text="Members card will appear here once added from admin." />
                </>
              )}
            </div>
          </div>
        </section>

        {homepageSettings.show_quick_links !== false && (
          <section
            className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8 lg:pb-14"
            style={{ order: homepageSettings.quick_links_order ?? 6 }}
          >
            <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:p-7">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  {homepageSettings.quick_links_eyebrow ||
                    fallbackHomepageSettings.quick_links_eyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {homepageSettings.quick_links_title ||
                    fallbackHomepageSettings.quick_links_title}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {quickLinks.length > 0 ? (
                  quickLinks.map((item) => (
                    <QuickLink
                      key={item.id}
                      href={item.href}
                      title={item.title}
                      subtitle={item.subtitle}
                    />
                  ))
                ) : (
                  <>
                    <QuickLink
                      href="/tournaments"
                      title="Tournament Hub"
                      subtitle="Schedule, fixtures, and tournament view"
                    />
                    <QuickLink
                      href="/teams"
                      title="Teams"
                      subtitle="Official team profiles and updates"
                    />
                    <QuickLink
                      href="/players"
                      title="Players"
                      subtitle="Player profiles, rankings, and watchlist"
                    />
                    <QuickLink
                      href="/rankings"
                      title="Rankings"
                      subtitle="Teams, players, and category tables"
                    />
                    <QuickLink
                      href="/media"
                      title="Media"
                      subtitle="Photos, match highlights, and moments"
                    />
                    <QuickLink
                      href="/history"
                      title="History"
                      subtitle="Cricket community story in Egypt"
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}


function getYoutubeEmbedUrl(url: string, autoplay: boolean) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  let videoId = "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") || "";
      if (!videoId && parsed.pathname.includes("/embed/")) {
        videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
      }
      if (!videoId && parsed.pathname.includes("/shorts/")) {
        videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      }
	  if (!videoId && parsed.pathname.includes("/live/")) {
  videoId = parsed.pathname.split("/live/")[1]?.split("/")[0] || "";
}
    }
  } catch {
    videoId = trimmed;
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
}

function getHomepageHeroTitle(
  heroMode: string,
  settings: HomepageSettingsRow,
  tournament: TournamentRow,
  latestNews: NewsRow[]
) {
  if (heroMode === "custom_highlight") {
    return settings.hero_custom_title || "Community Highlight";
  }
  if (heroMode === "news_highlight" && latestNews.length > 0) {
    return latestNews[0]?.title || "Featured News";
  }
  return tournament.title || "Premium Cricket Platform";
}

function getHomepageHeroSubtitle(
  heroMode: string,
  settings: HomepageSettingsRow,
  tournament: TournamentRow,
  latestNews: NewsRow[]
) {
  if (heroMode === "custom_highlight") {
    return (
      settings.hero_custom_subtitle ||
      "Latest featured community update will appear here."
    );
  }
  if (heroMode === "news_highlight" && latestNews.length > 0) {
    return latestNews[0]?.body || "Latest featured news from the platform.";
  }
  return tournament.overview || "Tournament overview will be updated soon.";
}

function getHomepageHeroImage(
  heroMode: string,
  settings: HomepageSettingsRow,
  tournament: TournamentRow,
  latestNews: NewsRow[]
) {
  if (settings.hero_banner_url) return settings.hero_banner_url;
  if (heroMode === "custom_highlight" && settings.hero_custom_image_url) {
    return settings.hero_custom_image_url;
  }
  if (heroMode === "news_highlight" && latestNews[0]?.image_url) {
    return latestNews[0].image_url;
  }
  return tournament.logo_url || "";
}

function HeroMediaBlock({
  youtubeUrl,
  autoplay,
  imageUrl,
  title,
}: {
  youtubeUrl: string;
  autoplay: boolean;
  imageUrl: string;
  title: string;
}) {
  const embedUrl = getYoutubeEmbedUrl(youtubeUrl, autoplay);

  return (
    <div className="my-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl bg-black/15 ring-1 ring-white/10">
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title || "Tournament video"}
          className="h-full min-h-[220px] w-full rounded-3xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={title || "Tournament banner"}
          className="h-full max-h-[260px] w-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] lg:max-h-[300px]"
        />
      ) : (
        <div className="px-6 text-center text-sm text-slate-300">
          Upload a tournament banner or add a YouTube link from admin.
        </div>
      )}
    </div>
  );
}

function hasInfoBoxes(update: any) {
  if (!update) return false;
  if (update.show_info_boxes === false) return false;
  return Boolean(
    update.info_1_value ||
      update.info_2_value ||
      update.info_3_value ||
      update.info_1_label ||
      update.info_2_label ||
      update.info_3_label
  );
}

function HomepageLiveUpdatePanel({
  activeLiveUpdate,
  liveUpdates,
  currentIndex,
  setCurrentIndex,
  featuredVisual,
  featuredTournament,
  homepageSettings,
}: {
  activeLiveUpdate: any | null;
  liveUpdates: any[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  featuredVisual: HomepageFeaturedVisualRow | null;
  featuredTournament: TournamentRow;
  homepageSettings: HomepageSettingsRow;
}) {
  const update = activeLiveUpdate || featuredVisual;
  const title = update?.title || featuredTournament.title || "Tournament Snapshot";
  const subtitle = update?.subtitle || "Stay tuned for the latest cricket update.";
  const imageUrl = update?.image_url || "";
  const showInfo = activeLiveUpdate ? hasInfoBoxes(activeLiveUpdate) : true;
  const showAction = activeLiveUpdate
    ? activeLiveUpdate.show_action_card !== false
    : true;

  if (!update) {
    return (
      <div className="flex h-auto min-h-[560px] flex-col overflow-hidden rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:h-[640px] lg:p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Tournament Snapshot</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {formatTournamentStatus(featuredTournament.status)}
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          <QuickStat
            label="Featured Tournament"
            value={featuredTournament.title || "Premium Cricket Platform"}
          />
          <QuickStat
            label="Tournament Window"
            value={featuredTournament.timeline || "To be announced"}
          />
          <QuickStat label="Venue" value={featuredTournament.venue || "Venue update soon"} />
          <QuickStat label="Format" value={featuredTournament.format || "Tournament"} />
        </div>
        <div className="mt-auto rounded-3xl bg-slate-950 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            {homepageSettings.hero_launch_note_title ||
              fallbackHomepageSettings.hero_launch_note_title}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {homepageSettings.hero_launch_note_text ||
              fallbackHomepageSettings.hero_launch_note_text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-auto min-h-[560px] flex-col overflow-hidden rounded-[30px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:h-[640px] lg:p-5">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <h2 className="min-w-0 text-xl font-bold leading-tight text-slate-950">
          {title}
        </h2>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Live Update
        </span>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || "Live update"}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="px-6 text-center text-sm text-slate-500">
            Upload a flyer/poster from admin.
          </div>
        )}
      </div>

      {showInfo ? (
        <div className="mt-3 grid shrink-0 gap-2">
          {activeLiveUpdate?.info_1_value || activeLiveUpdate?.info_1_label ? (
            <MiniInfo
              label={activeLiveUpdate?.info_1_label || "Info 1"}
              value={activeLiveUpdate?.info_1_value || "-"}
            />
          ) : null}
          {activeLiveUpdate?.info_2_value || activeLiveUpdate?.info_2_label ? (
            <MiniInfo
              label={activeLiveUpdate?.info_2_label || "Info 2"}
              value={activeLiveUpdate?.info_2_value || "-"}
            />
          ) : null}
          {activeLiveUpdate?.info_3_value || activeLiveUpdate?.info_3_label ? (
            <MiniInfo
              label={activeLiveUpdate?.info_3_label || "Info 3"}
              value={activeLiveUpdate?.info_3_value || "-"}
            />
          ) : null}
        </div>
      ) : null}

      {showAction ? (
        <div className="mt-3 shrink-0 rounded-3xl bg-slate-950 p-4 text-white">
          <p className="text-lg font-bold leading-tight">{title}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
            {subtitle}
          </p>

          <a
            href={update?.button_link || "/matches"}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl bg-emerald-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {update?.button_text || "Open Match Center"}
          </a>
        </div>
      ) : null}

      {liveUpdates.length > 1 ? (
        <div className="mt-3 flex shrink-0 items-center justify-center gap-2">
          {liveUpdates.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === currentIndex ? "bg-emerald-500" : "bg-slate-300"
              }`}
              aria-label={`Go to update ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HeroInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200 lg:px-3.5 lg:py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200 lg:px-3.5 lg:py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </a>
  );
}

function MatchCarousel({
  title,
  badge,
  badgeClass,
  emptyText,
  matches,
  teams,
  type,
  tournamentSlug,
}: {
  title: string;
  badge: string;
  badgeClass: string;
  emptyText: string;
  matches: MatchRow[];
  teams: TeamInfo[];
  type: "upcoming" | "completed";
  tournamentSlug: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!matches || matches.length <= 1) return;

    const timer = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const nextLeft =
        el.scrollLeft + el.clientWidth >= maxScroll - 20
          ? 0
          : el.scrollLeft + Math.min(320, el.clientWidth);

      el.scrollTo({ left: nextLeft, behavior: "smooth" });
    }, 3500);

    return () => window.clearInterval(timer);
  }, [matches]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {badge}
        </span>
      </div>

      {matches.length > 0 ? (
        <div ref={scrollerRef} className="flex snap-x gap-3 overflow-x-auto pb-2">
          {matches.map((match) => (
            <MatchMiniCard key={match.id} match={match} teams={teams} type={type} tournamentSlug={tournamentSlug} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function MatchMiniCard({
  match,
  teams,
  type,
  tournamentSlug,
}: {
  match: MatchRow;
  teams: TeamInfo[];
  type: "upcoming" | "completed";
  tournamentSlug: string;
}) {
  const primaryLink = getMatchPrimaryLink(match);
  const scheduleLink = tournamentSlug ? `/tournaments/${tournamentSlug}#schedule` : "/tournaments";

  return (
    <a href={scheduleLink} className="block min-w-[260px] snap-start rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-[1px] hover:border-emerald-300 hover:bg-white hover:shadow-md sm:min-w-[300px]">
      <p className="text-sm font-semibold text-slate-900">
        {buildHomepageMatchTitle(match, teams)}
      </p>

      {type === "upcoming" ? (
        <>
          <p className="mt-2 text-sm text-slate-600">
            {formatMatchDateTime(match.match_datetime)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Venue: {match.venue || "Venue update soon"}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">
            {match.result_summary || "Result summary not updated"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Player of the Match: {match.player_of_match || "Not updated"}
          </p>
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white">
          Open Schedule
        </span>
        {type === "completed" && primaryLink ? (
          <span className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700">
            Scorecard Available
          </span>
        ) : null}
      </div>
    </a>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm transition hover:shadow-md">
      {text}
    </div>
  );
}

function EmptyDarkCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
      {text}
    </div>
  );
}

function SkeletonRank() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md">
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