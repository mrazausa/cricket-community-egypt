import { NextResponse } from "next/server";

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

function getTeams(match: AnyMatch) {
  if (Array.isArray(match.teams)) return match.teams;

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

  const normalizeTeam = (team: any, fallback: string) => {
    if (!team) return { teamName: fallback, teamScore: "" };
    if (typeof team === "string") return { teamName: team, teamScore: "" };

    return {
      teamId: team.teamId || team.id || "",
      teamName:
        team.teamName ||
        team.name ||
        team.title ||
        team.shortName ||
        fallback,
      teamScore:
        team.teamScore ||
        team.score ||
        team.currentScore ||
        team.runs ||
        "",
      teamLogo:
        team.teamLogo ||
        team.logo ||
        team.logoUrl ||
        "",
    };
  };

  return [normalizeTeam(teamA, "Team A"), normalizeTeam(teamB, "Team B")];
}

function simplifyMatch(match: AnyMatch) {
  const teams = getTeams(match);
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

export async function GET() {
  try {
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

    const res = await fetch(
      `https://api.stumpsapp.com/clubs/id/${clubId}/matches`,
      {
        headers: {
          apiKey,
          Token: token,
        },
        cache: "no-store",
      }
    );

    const rawText = await res.text();

    let payload: any = null;
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }

    const allMatches = asArray(payload).map(simplifyMatch).filter((m) => m.matchId);

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
      success: res.ok,
      status: res.status,
      updatedAt: new Date().toISOString(),
      counts: {
        all: allMatches.length,
        live: liveMatches.length,
        upcoming: upcomingMatches.length,
        completed: completedMatches.length,
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
