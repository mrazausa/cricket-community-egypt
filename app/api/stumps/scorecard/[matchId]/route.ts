import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

type AttemptResult = {
  name: string;
  url: string;
  status: number;
  ok: boolean;
  useful: boolean;
  data: any;
};

function safeJson(rawText: string) {
  try {
    return JSON.parse(rawText);
  } catch {
    return { rawText };
  }
}

function firstArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

function hasUsefulScorecard(data: any): boolean {
  if (!data) return false;

  const innings = firstArray(
    data?.innings,
    data?.ininnings,
    data?.innnings,
    data?.data?.innings,
    data?.data?.ininnings,
    data?.data?.innnings,
    data?.scorecard?.innings,
    data?.data?.scorecard?.innings,
    data?.match?.innings,
    data?.data?.match?.innings
  );

  const batsmen = firstArray(
    data?.batsmen,
    data?.batters,
    data?.data?.batsmen,
    data?.data?.batters,
    data?.currentBatsmen,
    data?.data?.currentBatsmen
  );

  const bowlers = firstArray(
    data?.bowlers,
    data?.data?.bowlers,
    data?.currentBowlers,
    data?.data?.currentBowlers
  );

  const balls = firstArray(
    data?.balls,
    data?.recentBalls,
    data?.commentary,
    data?.data?.balls,
    data?.data?.recentBalls,
    data?.data?.commentary
  );

  const score =
    data?.score ??
    data?.teamScore ??
    data?.data?.score ??
    data?.data?.teamScore ??
    data?.currentScore ??
    data?.data?.currentScore;

  return innings.length > 0 || batsmen.length > 0 || bowlers.length > 0 || balls.length > 0 || Boolean(score);
}

function normalizeScorecardPayload(selected: any, matchId: string) {
  const root = selected?.data ?? selected ?? {};

  const innings = firstArray(
    root?.innings,
    root?.ininnings,
    root?.innnings,
    root?.scorecard?.innings,
    root?.scorecard?.ininnings,
    root?.scorecard?.innnings,
    root?.match?.innings,
    selected?.innings,
    selected?.ininnings,
    selected?.innnings,
    selected?.scorecard?.innings,
    selected?.scorecard?.ininnings,
    selected?.scorecard?.innnings
  );

  const currentInnings = innings[innings.length - 1] || innings[0] || {};

  const currentBatsmen = firstArray(
    root?.currentBatsmen,
    root?.currentBatters,
    root?.batsmen,
    root?.batters,
    root?.scorecard?.currentBatsmen,
    root?.scorecard?.batters,
    currentInnings?.battingPlayers,
    currentInnings?.batsmen,
    currentInnings?.batters
  ).filter((p: any) => String(p?.dismissalStatus || "").toLowerCase() === "batting" || p?.isStriker || p?.onStrike);

  const allBowlers = firstArray(
    root?.bowlers,
    root?.currentBowlers,
    root?.scorecard?.bowlers,
    currentInnings?.bowlingPlayers,
    currentInnings?.bowlers
  );

  const recentBalls = firstArray(
    root?.recentBalls,
    root?.balls,
    root?.commentary,
    root?.scorecard?.recentBalls,
    root?.scorecard?.balls,
    root?.scorecard?.commentary,
    currentInnings?.recentBalls,
    currentInnings?.balls,
    currentInnings?.commentary
  );

  return {
    matchId: root?.matchId ?? root?.id ?? matchId,
    matchStatus: root?.matchStatus ?? root?.status ?? root?.match?.matchStatus ?? null,
    matchResult: root?.matchResult ?? root?.result ?? null,
    matchTitle: root?.matchTitle ?? root?.title ?? null,
    matchFormat: root?.matchFormat ?? root?.format ?? root?.match?.matchFormat ?? null,
    teams: root?.teams ?? root?.match?.teams ?? [],
    innings,
    // Compatibility with yesterday overlay versions that used the typo.
    innnings: innings,
    currentBatsmen,
    currentBowler:
      root?.currentBowler ??
      root?.bowler ??
      root?.scorecard?.currentBowler ??
      root?.scorecard?.bowler ??
      allBowlers?.[0] ??
      null,
    bowlers: allBowlers,
    recentBalls,
    raw: root,
  };
}

async function fetchAttempt(name: string, url: string): Promise<AttemptResult> {
  const res = await fetch(url, {
    headers: {
      apiKey: process.env.STUMPS_API_KEY || "",
      Token: process.env.STUMPS_TOKEN || "",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const rawText = await res.text();
  const data = safeJson(rawText);

  return {
    name,
    url,
    status: res.status,
    ok: res.ok,
    useful: hasUsefulScorecard(data),
    data,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { matchId } = await context.params;
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get("debug") === "1";

    const apiBase = "https://api.stumpsapp.com";

    /*
      STUMPS has returned empty scorecard for some live matches from:
      /matches/id/{matchId}/scorecard

      This route now tries multiple known public scorecard/live patterns and
      chooses the first response that contains useful innings/batter/bowler/ball data.
    */
    const candidates = [
      {
        name: "scorecard-by-id",
        url: `${apiBase}/matches/id/${matchId}/scorecard`,
      },
      {
        name: "scorecard-direct-match",
        url: `${apiBase}/matches/${matchId}/scorecard`,
      },
      {
        name: "live-scorecard-by-id",
        url: `${apiBase}/matches/id/${matchId}/live-scorecard`,
      },
      {
        name: "live-match-by-id",
        url: `${apiBase}/matches/id/${matchId}/live`,
      },
      {
        name: "match-by-id",
        url: `${apiBase}/matches/id/${matchId}`,
      },
    ];

    const attempts: AttemptResult[] = [];

    for (const candidate of candidates) {
      try {
        const attempt = await fetchAttempt(candidate.name, candidate.url);
        attempts.push(attempt);

        if (attempt.ok && attempt.useful) {
          return NextResponse.json({
            success: true,
            matchId,
            status: attempt.status,
            source: attempt.name,
            data: normalizeScorecardPayload(attempt.data, matchId),
            ...(debug
              ? {
                  debug: {
                    attempts,
                  },
                }
              : {}),
          });
        }
      } catch (error: any) {
        attempts.push({
          name: candidate.name,
          url: candidate.url,
          status: 0,
          ok: false,
          useful: false,
          data: { error: error?.message || "Fetch failed" },
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        matchId,
        status: attempts[0]?.status ?? 0,
        error:
          "No useful scorecard data returned from STUMPS. Open this URL with ?debug=1 to see each attempted endpoint.",
        data: {
          matchId,
          matchStatus: null,
          innings: [],
          currentBatsmen: [],
          currentBowler: null,
          bowlers: [],
          recentBalls: [],
        },
        ...(debug
          ? {
              debug: {
                attempts,
              },
            }
          : {}),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to fetch STUMPS scorecard",
    });
  }
}
