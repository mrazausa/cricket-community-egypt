"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TeamScore = {
  teamId?: string;
  teamName?: string;
  teamScore?: string;
};

type StumpsMatch = {
  matchId: string;
  matchStatus?: string;
  matchResult?: string;
  matchTitle?: string;
  matchDate?: string;
  matchTime?: string;
  teams?: TeamScore[];
};

export default function HomepageLiveScore({ locale }: { locale: string }) {
  const [liveMatches, setLiveMatches] = useState<StumpsMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<StumpsMatch[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLiveSummary() {
    try {
      const res = await fetch("/api/stumps/live-summary", {
        cache: "no-store",
      });

      const data = await res.json();

      setLiveMatches(Array.isArray(data.liveMatches) ? data.liveMatches : []);
      setUpcomingMatches(
        Array.isArray(data.upcomingMatches) ? data.upcomingMatches : []
      );
    } catch {
      setLiveMatches([]);
      setUpcomingMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLiveSummary();

    const interval = setInterval(() => {
      loadLiveSummary();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const nextMatch = useMemo(() => upcomingMatches?.[0], [upcomingMatches]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/15 bg-slate-950/70 p-5 text-white shadow-2xl">
        <div className="animate-pulse text-sm text-white/60">
          Checking live scores...
        </div>
      </div>
    );
  }

  if (liveMatches.length > 0) {
    return (
      <div className="rounded-3xl border border-red-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
              Live Now
            </div>
            <div className="text-lg font-black">
              {liveMatches.length === 1
                ? "Match in progress"
                : `${liveMatches.length} live matches`}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-black uppercase">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Live
          </div>
        </div>

        <div className="space-y-3">
          {liveMatches.slice(0, 2).map((match) => {
            const teamA = match.teams?.[0];
            const teamB = match.teams?.[1];

            return (
              <div
                key={match.matchId}
                className="rounded-2xl border border-white/10 bg-white/10 p-4"
              >
                <div className="mb-2 text-xs font-bold uppercase text-white/50">
                  {match.matchTitle || `${teamA?.teamName || "Team A"} vs ${teamB?.teamName || "Team B"}`}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold">{teamA?.teamName || "Team A"}</span>
                    <span className="font-black text-emerald-300">
                      {teamA?.teamScore || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold">{teamB?.teamName || "Team B"}</span>
                    <span className="font-black text-emerald-300">
                      {teamB?.teamScore || "-"}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/${locale}/live/${match.matchId}`}
                  className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase text-slate-950 hover:bg-emerald-200"
                >
                  Open Live →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 p-5 text-white shadow-2xl">
      <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
        Next Match
      </div>

      {nextMatch ? (
        <div className="mt-3">
          <div className="text-lg font-black">
            {nextMatch.teams?.[0]?.teamName || "Team A"} vs{" "}
            {nextMatch.teams?.[1]?.teamName || "Team B"}
          </div>

          <div className="mt-2 text-sm text-white/70">
            {nextMatch.matchDate} • {nextMatch.matchTime}
          </div>

          <div className="mt-4 whitespace-nowrap text-sm font-black uppercase text-amber-300">
            NEXT MATCH • Auto countdown area
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-white/60">
          No live or upcoming match found.
        </div>
      )}
    </div>
  );
}