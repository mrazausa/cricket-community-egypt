import { NextRequest, NextResponse } from "next/server";

type AnyMatch = Record<string, any>;

function asArray(payload: any): AnyMatch[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.data?.matches)) return payload.data.matches;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function normalizeStatus(status: unknown) {
  return String(status || "").trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeDateTime(match: AnyMatch) {
  const date = match.matchDate || match.date || match.startDate || "";
  const time = match.matchTime || match.time || match.startTime || "";

  const stamp = `${date} ${time}`.trim();
  const parsed = stamp ? new Date(stamp) : null;

  return Number.isNaN(parsed?.getTime()) ? null : parsed;
}

function getMatchId(match: AnyMatch) {
  return (
    match.matchId ||
    match.id ||
    match._id ||
    match.match_id ||
    match.matchCode ||
    ""
  );
}

function pickFirstString(row: AnyMatch, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function fetchTeamLogoMap() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const logoMap = new Map<string, string>();

  if (!supabaseUrl || !supabaseKey) {
    return {
      logoMap,
      source: "missing-supabase-env",
      rows: 0,
      error: "Missing Supabase URL/key",
    };
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/teams?select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      return {
        logoMap,
        source: "teams-query-failed",
        rows: 0,
        error: text,
      };
    }

    let rows: AnyMatch[] = [];

    try {
      rows = JSON.parse(text);
    } catch {
      rows = [];
    }

    for (const row of rows || []) {
      const logo = pickFirstString(row, [
        "logo_url",
        "team_logo_url",
        "team_logo",
        "logo",
        "image_url",
        "photo_url",
        "avatar_url",
      ]);

      const names = [
        row.id,
        row.team_id,
        row.stumps_team_id,
        row.name,
        row.team_name,
        row.title,
        row.short_name,
      ];

      if (!logo) continue;

      for (const name of names) {
        const normalized = normalizeName(name);
        if (normalized) logoMap.set(normalized, logo);
      }
    }

    return {
      logoMap,
      source: logoMap.size > 0 ? "supabase-teams" : "teams-no-logo-columns-matched",
      rows: rows.length,
      error: "",
    };
  } catch (error: any) {
    return {
      logoMap,
      source: "teams-query-error",
      rows: 0,
      error: error?.message || "Unknown Supabase teams query error",
    };
  }
}

function enrichTeamWithLogo(
  team: any,
  fallback: string,
  logoMap: Map<string, string>
) {
  if (!team) {
    return {
      teamId: "",
      teamName: fallback,
      teamScore: "",
      teamLogo: "",
    };
  }

  if (typeof team === "string") {
    return {
      teamId: "",
      teamName: team,
      teamScore: "",
      teamLogo: logoMap.get(normalizeName(team)) || "",
    };
  }

  const teamId = team.teamId || team.id || team.team_id || "";
  const teamName =
    team.teamName ||
    team.name ||
    team.team_name ||
    team.title ||
    team.shortName ||
    team.short_name ||
    fallback;

  const existingLogo =
    team.teamLogo ||
    team.logo ||
    team.logoUrl ||
    team.logo_url ||
    team.team_logo_url ||
    team.team_logo ||
    team.image_url ||
    "";

  const mappedLogo =
    logoMap.get(normalizeName(teamId)) ||
    logoMap.get(normalizeName(teamName)) ||
    "";

  return {
    teamId,
    teamName,
    teamScore:
      team.teamScore ||
      team.score ||
      team.currentScore ||
      team.runs ||
      "",
    teamLogo: existingLogo || mappedLogo,
  };
}

function getTeams(match: AnyMatch, logoMap: Map<string, string>) {
  if (Array.isArray(match.teams)) {
    return match.teams.map((team: any, index: number) =>
      enrichTeamWithLogo(team, index === 0 ? "Team A" : "Team B", logoMap)
    );
  }

  const teamA =
    match.teamA ||
    match.team1 ||
    match.firstTeam ||
    match.homeTeam ||
    match.teamOne ||
    null;

  const teamB =
    match.teamB ||
    match.team2 ||
    match.secondTeam ||
    match.awayTeam ||
    match.teamTwo ||
    null;

  return [
    enrichTeamWithLogo(teamA, "Team A", logoMap),
    enrichTeamWithLogo(teamB, "Team B", logoMap),
  ];
}

function simplifyMatch(match: AnyMatch, logoMap: Map<string, string>) {
  const teams = getTeams(match, logoMap);
  const matchId = getMatchId(match);

  return {
    matchId,
    tournamentName: match.tournamentName || match.seriesName || "",
    tournamentId: match.tournamentId || match.seriesId || "",
    matchTitle:
      match.matchTitle ||
      match.title ||
      `${teams?.[0]?.teamName || "Team A"} vs ${teams?.[1]?.teamName || "Team B"}`,
    matchFormat: match.matchFormat || match.format || "",
    matchDate: match.matchDate || match.date || "",
    matchTime: match.matchTime || match.time || "",
    matchStatus: match.matchStatus || match.status || "",
    matchResult: match.matchResult || match.result || "",
    venue: match.venue || match.ground || "",
    teams,
    raw: match,
  };
}

function isLive(match: AnyMatch) {
  const status = normalizeStatus(match.matchStatus || match.status);

  return (
    status.includes("live") ||
    status.includes("started") ||
    status.includes("progress") ||
    status.includes("innings") ||
    status.includes("toss") ||
    status.includes("delayed") ||
    status.includes("interrupted")
  );
}

function isCompleted(match: AnyMatch) {
  const status = normalizeStatus(match.matchStatus || match.status);

  return (
    status.includes("completed") ||
    status.includes("complete") ||
    status.includes("finished") ||
    status.includes("result") ||
    status.includes("abandoned") ||
    Boolean(match.matchResult || match.result)
  );
}

function isUpcoming(match: AnyMatch) {
  const status = normalizeStatus(match.matchStatus || match.status);

  if (isLive(match) || isCompleted(match)) return false;

  return (
    status.includes("upcoming") ||
    status.includes("scheduled") ||
    status.includes("fixture") ||
    status.includes("not started") ||
    status.includes("yet to start") ||
    !status
  );
}

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId");
    const tournamentName = request.nextUrl.searchParams.get("tournamentName");

    const clubId = process.env.STUMPS_CLUB_ID;
    const apiKey = process.env.STUMPS_API_KEY;
    const token = process.env.STUMPS_TOKEN;

    if (!clubId || !apiKey || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing STUMPS environment variables",
          liveMatches: [],
          upcomingMatches: [],
          completedMatches: [],
        },
        { status: 200 }
      );
    }

    const [stumpsRes, logoInfo] = await Promise.all([
      fetch(`https://api.stumpsapp.com/clubs/id/${clubId}/matches`, {
        headers: {
          apiKey,
          Token: token,
        },
        cache: "no-store",
      }),
      fetchTeamLogoMap(),
    ]);

    const rawText = await stumpsRes.text();

    let payload: any = null;
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }

    let allMatches = asArray(payload)
      .map((match) => simplifyMatch(match, logoInfo.logoMap))
      .filter((m) => m.matchId);

    if (tournamentId) {
      const targetId = tournamentId.trim().toLowerCase();
      allMatches = allMatches.filter(
        (m) => String(m.tournamentId || "").trim().toLowerCase() === targetId
      );
    } else if (tournamentName) {
      const targetName = tournamentName.trim().toLowerCase();
      allMatches = allMatches.filter((m) =>
        String(m.tournamentName || "").trim().toLowerCase().includes(targetName)
      );
    }

    const liveMatches = allMatches.filter(isLive);

    const upcomingMatches = allMatches
      .filter(isUpcoming)
      .sort((a, b) => {
        const da = normalizeDateTime(a)?.getTime() || Number.MAX_SAFE_INTEGER;
        const db = normalizeDateTime(b)?.getTime() || Number.MAX_SAFE_INTEGER;
        return da - db;
      });

    const completedMatches = allMatches
      .filter(isCompleted)
      .sort((a, b) => {
        const da = normalizeDateTime(a)?.getTime() || 0;
        const db = normalizeDateTime(b)?.getTime() || 0;
        return db - da;
      });

    return NextResponse.json({
      success: stumpsRes.ok,
      status: stumpsRes.status,
      updatedAt: new Date().toISOString(),
      filter: {
        tournamentId: tournamentId || null,
        tournamentName: tournamentName || null,
      },
      logoSource: logoInfo.source,
      logoDebug: {
        rows: logoInfo.rows,
        logos: logoInfo.logoMap.size,
        error: logoInfo.error,
      },
      counts: {
        all: allMatches.length,
        live: liveMatches.length,
        upcoming: upcomingMatches.length,
        completed: completedMatches.length,
        logos: logoInfo.logoMap.size,
      },
      liveMatches,
      upcomingMatches,
      completedMatches,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to build STUMPS live summary",
        liveMatches: [],
        upcomingMatches: [],
        completedMatches: [],
      },
      { status: 200 }
    );
  }
}
