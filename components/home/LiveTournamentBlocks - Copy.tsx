"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TeamScore = {
  teamId?: string;
  teamName?: string;
  teamScore?: string;
  teamLogo?: string;
};

type LiveSummaryMatch = {
  matchId: string;
  tournamentName?: string;
  matchTitle?: string;
  matchFormat?: string;
  matchDate?: string;
  matchTime?: string;
  matchStatus?: string;
  matchResult?: string;
  venue?: string;
  teams?: TeamScore[];
};

type LiveSummaryResponse = {
  success?: boolean;
  updatedAt?: string;
  counts?: {
    all?: number;
    live?: number;
    upcoming?: number;
    completed?: number;
  };
  liveMatches?: LiveSummaryMatch[];
  upcomingMatches?: LiveSummaryMatch[];
  completedMatches?: LiveSummaryMatch[];
};

function teamName(team?: TeamScore, fallback = "Team") {
  return team?.teamName || fallback;
}

function teamScore(team?: TeamScore) {
  return team?.teamScore || "";
}

function matchTimeLabel(match: LiveSummaryMatch) {
  const date = match.matchDate || "";
  const time = match.matchTime || "";
  if (date && time) return `${date}, ${time}`;
  return date || time || "Time update soon";
}

function MatchBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-14 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
        Match
      </span>
      <span className="text-lg font-black">{children}</span>
    </div>
  );
}

function MiniLogo({ team }: { team?: TeamScore }) {
  if (!team?.teamLogo) {
    return (
      <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100" />
    );
  }

  return (
    <img
      src={team.teamLogo}
      alt={team.teamName || "Team logo"}
      className="h-8 w-8 rounded-full object-contain"
    />
  );
}

function LiveCard({
  match,
  locale,
}: {
  match: LiveSummaryMatch;
  locale: string;
}) {
  const teamA = match.teams?.[0];
  const teamB = match.teams?.[1];

  return (
    <div className="rounded-[1.6rem] border border-red-200 bg-gradient-to-br from-red-50 via-white to-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Live Now
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
          {match.matchFormat || "Match"}
        </span>
      </div>

      <div className="space-y-3">
        {[teamA, teamB].map((team, index) => (
          <div
            key={`${match.matchId}-${index}`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MiniLogo team={team} />
              <span className="truncate text-base font-black text-slate-950">
                {teamName(team, index === 0 ? "Team A" : "Team B")}
              </span>
            </div>
            <span className="shrink-0 text-base font-black text-emerald-700">
              {teamScore(team) || "-"}
            </span>
          </div>
        ))}
      </div>

      <Link
        href={`/${locale}/live/${match.matchId}`}
        className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white hover:bg-emerald-700"
      >
        Open Live →
      </Link>
    </div>
  );
}

function FixtureCard({
  match,
  locale,
  completed = false,
}: {
  match: LiveSummaryMatch;
  locale: string;
  completed?: boolean;
}) {
  const teamA = match.teams?.[0];
  const teamB = match.teams?.[1];
  const matchNo = match.matchTitle?.match(/#?\d+/)?.[0]?.replace("#", "") || "";

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <MatchBadge>{matchNo ? `#${matchNo}` : "—"}</MatchBadge>

        <div className="min-w-0 flex-1">
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">
            {completed ? "Completed Result" : "Upcoming Match"}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xl font-black text-slate-950">
            <MiniLogo team={teamA} />
            <span>{teamName(teamA, "Team A")}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
              vs
            </span>
            <MiniLogo team={teamB} />
            <span>{teamName(teamB, "Team B")}</span>
          </div>

          {completed ? (
            <div className="mt-3 text-sm text-slate-700">
              <span className="font-black text-slate-950">Result:</span>{" "}
              {match.matchResult || "Result update soon"}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
              <span>
                <span className="font-black text-slate-950">Time:</span>{" "}
                {matchTimeLabel(match)}
              </span>
              {match.venue ? (
                <span>
                  <span className="font-black text-slate-950">Venue:</span>{" "}
                  {match.venue}
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/live/${match.matchId}`}
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
            >
              Details →
            </Link>
            {completed ? (
              <Link
                href={`/${locale}/live/${match.matchId}`}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-900 hover:bg-slate-100"
              >
                Scorecard
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveTournamentBlocks({ locale }: { locale: string }) {
  const [data, setData] = useState<LiveSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSummary() {
    try {
      const res = await fetch("/api/stumps/live-summary", {
        cache: "no-store",
      });
      const json = (await res.json()) as LiveSummaryResponse;
      setData(json);
    } catch {
      setData({
        liveMatches: [],
        upcomingMatches: [],
        completedMatches: [],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    const timer = window.setInterval(loadSummary, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const liveMatches = useMemo(() => data?.liveMatches || [], [data]);
  const upcomingMatches = useMemo(() => data?.upcomingMatches || [], [data]);
  const completedMatches = useMemo(() => data?.completedMatches || [], [data]);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse text-sm font-bold text-slate-500">
          Loading STUMPS match center...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-700">
          Live Tournament Blocks
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          Match Center
        </h2>
      </div>

      {liveMatches.length > 0 ? (
        <div className="rounded-[2rem] border border-red-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">Live Now</h3>
              <p className="text-sm font-semibold text-slate-500">
                Auto-synced from STUMPS every 15 seconds.
              </p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
              {liveMatches.length} Live
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {liveMatches.slice(0, 2).map((match) => (
              <LiveCard key={match.matchId} match={match} locale={locale} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-800">
              Feed • Live score will appear here when match starts
            </p>
            <span className="rounded-full bg-emerald-200 px-4 py-1 text-xs font-black uppercase text-emerald-900">
              Next Match
            </span>
          </div>
        </div>
      )}

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-700">
              Quick Match View
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Showing latest 2 upcoming and latest 2 completed matches.
            </p>
          </div>

          <Link
            href={`/${locale}/tournaments`}
            className="hidden rounded-full border border-slate-200 px-5 py-2 text-sm font-black text-slate-950 hover:bg-slate-50 sm:inline-flex"
          >
            View Full Match Center →
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.6rem] bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-950">Upcoming Matches</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Next fixtures in vertical match order
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                Next {Math.min(upcomingMatches.length, 2)}
              </span>
            </div>

            <div className="space-y-4">
              {upcomingMatches.slice(0, 2).length > 0 ? (
                upcomingMatches
                  .slice(0, 2)
                  .map((match) => (
                    <FixtureCard
                      key={match.matchId}
                      match={match}
                      locale={locale}
                    />
                  ))
              ) : (
                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
                  No upcoming match found from STUMPS.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.6rem] bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-950">Completed Results</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Finished games with result summary
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                Latest {Math.min(completedMatches.length, 2)}
              </span>
            </div>

            <div className="space-y-4">
              {completedMatches.slice(0, 2).length > 0 ? (
                completedMatches
                  .slice(0, 2)
                  .map((match) => (
                    <FixtureCard
                      key={match.matchId}
                      match={match}
                      locale={locale}
                      completed
                    />
                  ))
              ) : (
                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
                  No completed match found from STUMPS.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
