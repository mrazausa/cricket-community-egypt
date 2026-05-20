"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MatchTeam = {
  teamName?: string;
  teamScore?: string | null;
  teamLogo?: string;
};

type Match = {
  matchId: string;
  matchStatus?: string;
  matchFormat?: string;
  matchResult?: string;
  matchTitle?: string;
  teams?: MatchTeam[];
};

function MiniLogo({ team }: { team?: MatchTeam }) {
  if (!team?.teamLogo) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white/70 ring-1 ring-white/10">
        {(team?.teamName || "T").slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={team.teamLogo}
      alt={team.teamName || "Team logo"}
      className="h-10 w-10 rounded-full object-contain"
    />
  );
}

function LiveMatchCard({
  match,
  locale,
  compact = false,
}: {
  match: Match;
  locale: string;
  compact?: boolean;
}) {
  const teamA = match.teams?.[0];
  const teamB = match.teams?.[1];

  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-[1.6rem] border border-red-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 text-white shadow-2xl">
      <div className="absolute right-3 top-3">
        <div className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Live
        </div>
      </div>

      <div className="pr-20">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
          Live Score Feed
        </p>
        <h3 className={`${compact ? "text-xl" : "text-2xl"} mt-2 font-black leading-tight`}>
          {match.matchTitle ||
            `${teamA?.teamName || "Team A"} vs ${teamB?.teamName || "Team B"}`}
        </h3>
      </div>

      <div className="mt-4 space-y-3">
        {[teamA, teamB].map((team, idx) => (
          <div
            key={`${match.matchId}-${idx}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MiniLogo team={team} />
              <span className="truncate text-base font-black">
                {team?.teamName || (idx === 0 ? "Team A" : "Team B")}
              </span>
            </div>

            <span className="shrink-0 text-base font-black text-emerald-300">
              {team?.teamScore || "-"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-white/60">
          Auto-synced every 5s
        </p>
        <a
          href={`/${locale}/live/${match.matchId}`}
          className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase text-slate-950 transition hover:bg-emerald-300"
        >
          Open →
        </a>
      </div>
    </div>
  );
}

export default function HeroLiveScorePanel({
  locale,
  fallbackImageUrl,
  title,
}: {
  locale: string;
  fallbackImageUrl?: string;
  title?: string;
}) {
  const LIVE_HOLD_MS = 30000;
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const lastLiveAtRef = useRef<number>(0);
  const lastStableMatchesRef = useRef<Match[]>([]);

  async function loadLiveMatches() {
    try {
      const res = await fetch("/api/stumps/live-summary", {
        cache: "no-store",
      });

      const data = await res.json();
      const freshLiveMatches = Array.isArray(data?.liveMatches)
        ? data.liveMatches
        : [];

      // Fetch latest live scorecard for each live match
      const enrichedMatches = await Promise.all(
        freshLiveMatches.map(async (match: Match) => {
          try {
            const scoreRes = await fetch(
              `/api/stumps/scorecard/${match.matchId}`,
              { cache: "no-store" }
            );

            const scoreData = await scoreRes.json();

            return {
              ...match,
              teams:
                scoreData?.teams && Array.isArray(scoreData.teams)
                  ? scoreData.teams
                  : match.teams,
              matchStatus:
                scoreData?.matchStatus || match.matchStatus,
              matchResult:
                scoreData?.matchResult || match.matchResult,
            };
          } catch (err) {
            console.error("Scorecard sync failed", err);
            return match;
          }
        })
      );

      if (enrichedMatches.length > 0) {
        lastLiveAtRef.current = Date.now();
        lastStableMatchesRef.current = enrichedMatches;
        setLiveMatches(enrichedMatches);
        return;
      }

      const stillInsideHoldWindow =
        lastStableMatchesRef.current.length > 0 &&
        Date.now() - lastLiveAtRef.current < LIVE_HOLD_MS;

      if (stillInsideHoldWindow) {
        setLiveMatches(lastStableMatchesRef.current);
        return;
      }

      lastStableMatchesRef.current = [];
      setLiveMatches([]);
    } catch (error) {
      console.error("Live summary failed", error);

      const stillInsideHoldWindow =
        lastStableMatchesRef.current.length > 0 &&
        Date.now() - lastLiveAtRef.current < LIVE_HOLD_MS;

      if (stillInsideHoldWindow) {
        setLiveMatches(lastStableMatchesRef.current);
        return;
      }

      setLiveMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLiveMatches();
    const interval = window.setInterval(loadLiveMatches, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const liveToShow = useMemo(() => liveMatches.slice(0, 3), [liveMatches]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("cce-hero-live-status", {
        detail: { active: liveToShow.length > 0 },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("cce-hero-live-status", {
          detail: { active: false },
        })
      );
    };
  }, [liveToShow.length]);

  if (loading) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/5 text-sm font-bold text-white/60 sm:h-[300px]">
        Checking STUMPS live feed...
      </div>
    );
  }

  if (liveToShow.length === 0) {
    return (
      <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/5">
        {fallbackImageUrl ? (
          <img
            src={fallbackImageUrl}
            alt={title || "Tournament media"}
            className="h-[250px] w-full object-contain sm:h-[300px]"
          />
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm font-bold text-white/50 sm:h-[300px]">
            Tournament media will appear here
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-red-400/30 bg-slate-950/70 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-300">
            CCE Live Match Hub
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            {liveToShow.length === 1
              ? "Live match in progress"
              : `${liveToShow.length} live matches in progress`}
          </h2>
        </div>
        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">
          Live
        </span>
      </div>

      <div
        className={`grid gap-3 ${
          liveToShow.length === 1
            ? "grid-cols-1"
            : liveToShow.length === 2
            ? "grid-cols-1 xl:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {liveToShow.map((match) => (
          <LiveMatchCard
            key={match.matchId}
            match={match}
            locale={locale}
            compact={liveToShow.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
