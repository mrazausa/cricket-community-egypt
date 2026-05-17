"use client";

import { useEffect, useMemo, useState } from "react";

type BattingPlayer = {
  playerName?: string;
  dismissalStatus?: string | null;
  runs?: number | null;
  balls?: number | null;
  fours?: number | null;
  sixes?: number | null;
  strikeRate?: string | null;
};

type BowlingPlayer = {
  playerName?: string;
  overs?: string | null;
  maidens?: number | null;
  runsConceded?: number | null;
  wickets?: number | null;
  economy?: string | null;
};

type Innings = {
  inningsNo?: number;
  battingTeamName?: string;
  bowlingTeamName?: string;
  teamScore?: number | null;
  wickets?: number | null;
  overs?: string | null;
  battingPlayers?: BattingPlayer[];
  bowlingPlayers?: BowlingPlayer[];
  inningsExtras?: {
    total?: number | null;
  };
};

type ScorecardData = {
  matchId?: string;
  matchStatus?: string;
  matchResult?: string;
  innnings?: Innings[];
  innings?: Innings[];
};

type ApiResponse = {
  success?: boolean;
  data?: ScorecardData;
  error?: string;
};

type SummaryTeam = {
  teamId?: string;
  teamName?: string;
  teamScore?: string | null;
  teamLogo?: string | null;
};

type SummaryMatch = {
  matchId?: string;
  matchStatus?: string;
  matchResult?: string;
  matchTitle?: string;
  matchFormat?: string;
  teams?: SummaryTeam[];
};

type SummaryResponse = {
  liveMatches?: SummaryMatch[];
  upcomingMatches?: SummaryMatch[];
  completedMatches?: SummaryMatch[];
};

function scoreText(innings?: Innings) {
  if (!innings) return "0/0";
  const runs = innings.teamScore ?? 0;
  const wickets = innings.wickets ?? 0;
  return `${runs}/${wickets}`;
}

function oversText(innings?: Innings) {
  return innings?.overs ? `(${innings.overs} ov)` : "";
}

function getActiveBatters(innings?: Innings) {
  const batters = innings?.battingPlayers || [];
  const active = batters.filter((player) => {
    const status = String(player.dismissalStatus || "").toLowerCase();
    return !status || status.includes("not out");
  });

  return (active.length ? active : batters).slice(0, 2);
}

function getLeadBowler(innings?: Innings) {
  return (innings?.bowlingPlayers || [])[0];
}

function PlayerLine({ player }: { player?: BattingPlayer }) {
  if (!player?.playerName) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2">
      <span className="truncate text-sm font-black text-white">
        {player.playerName}
      </span>
      <span className="shrink-0 text-sm font-black text-emerald-300">
        {player.runs ?? 0}
        <span className="text-white/60">({player.balls ?? 0})</span>
      </span>
    </div>
  );
}

function TeamLogo({ team }: { team?: SummaryTeam }) {
  if (!team?.teamLogo) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/60 ring-1 ring-white/10">
        {(team?.teamName || "T").slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={team.teamLogo}
      alt={team.teamName || "Team logo"}
      className="h-12 w-12 rounded-full bg-white object-contain p-1"
    />
  );
}

function SummaryScoreLine({ team }: { team?: SummaryTeam }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} />
        <span className="truncate text-xl font-black text-white">
          {team?.teamName || "Team"}
        </span>
      </div>
      <span className="shrink-0 text-3xl font-black text-emerald-300">
        {team?.teamScore || "-"}
      </span>
    </div>
  );
}

function SummaryFallbackOverlay({
  match,
  variant,
  lastUpdated,
}: {
  match: SummaryMatch;
  variant: "lower-third" | "scorebug" | "full";
  lastUpdated: string;
}) {
  const teamA = match.teams?.[0];
  const teamB = match.teams?.[1];

  if (variant === "scorebug") {
    return (
      <div className="fixed right-10 top-10 w-[520px] rounded-[2rem] bg-slate-950/92 p-5 text-white shadow-2xl ring-1 ring-emerald-300/30">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.22em]">
            Live
          </span>
          <span className="text-xs font-bold text-white/50">
            Updated {lastUpdated}
          </span>
        </div>

        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
          CCE Live Score
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight">
          {match.matchTitle || `${teamA?.teamName || "Team A"} vs ${teamB?.teamName || "Team B"}`}
        </h1>

        <div className="mt-4 space-y-3">
          <SummaryScoreLine team={teamA} />
          <SummaryScoreLine team={teamB} />
        </div>

        <p className="mt-4 text-xs font-bold text-white/50">
          Feed fallback: STUMPS match summary
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-10 left-1/2 w-[1500px] -translate-x-1/2 overflow-hidden rounded-[2rem] bg-slate-950/94 text-white shadow-2xl ring-1 ring-emerald-300/25">
      <div className="flex items-stretch">
        <div className="flex w-[360px] flex-col justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500 ring-4 ring-red-500/20" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">
              CCE Live
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight">
            {teamA?.teamName || "Team A"}
          </h2>
          <p className="mt-1 text-sm font-bold text-white/75">
            vs {teamB?.teamName || "Team B"}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-between gap-8 px-8 py-6">
          <div className="grid flex-1 gap-3">
            <SummaryScoreLine team={teamA} />
            <SummaryScoreLine team={teamB} />
          </div>

          <div className="w-[360px] rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Match Status
            </p>
            <p className="mt-2 text-xl font-black">
              {match.matchStatus || "Live score updating"}
            </p>
            {match.matchResult ? (
              <p className="mt-2 text-sm font-bold text-amber-200">
                {match.matchResult}
              </p>
            ) : null}
          </div>

          <div className="w-[150px] text-right">
            <p className="text-xs font-bold text-white/40">Updated</p>
            <p className="text-sm font-black text-white">{lastUpdated}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CricketScoreOverlay({
  matchId,
  variant = "lower-third",
}: {
  matchId: string;
  variant?: "lower-third" | "scorebug" | "full";
}) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [summaryMatch, setSummaryMatch] = useState<SummaryMatch | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadSummaryFallback() {
    try {
      const res = await fetch("/api/stumps/live-summary", {
        cache: "no-store",
      });

      const json = (await res.json()) as SummaryResponse;
      const allMatches = [
        ...(json.liveMatches || []),
        ...(json.upcomingMatches || []),
        ...(json.completedMatches || []),
      ];

      const match = allMatches.find((item) => item.matchId === matchId) || null;
      setSummaryMatch(match);
    } catch {
      setSummaryMatch(null);
    }
  }

  async function loadScorecard() {
    try {
      const res = await fetch(`/api/stumps/scorecard/${matchId}`, {
        cache: "no-store",
      });

      const json = (await res.json()) as ApiResponse;

      const scorecard = json.data || null;
      const innings = scorecard?.innnings || scorecard?.innings || [];

      if (scorecard && innings.length > 0) {
        setData(scorecard);
        setSummaryMatch(null);
        setError("");
      } else {
        setData(scorecard);
        await loadSummaryFallback();
        setError("");
      }

      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err: any) {
      await loadSummaryFallback();
      setError(err?.message || "Scorecard fetch failed");
    }
  }

  useEffect(() => {
    loadScorecard();
    const timer = window.setInterval(loadScorecard, 3000);
    return () => window.clearInterval(timer);
  }, [matchId]);

  const innings = useMemo(() => data?.innnings || data?.innings || [], [data]);
  const currentInnings = innings[innings.length - 1] || innings[0];
  const previousInnings = innings.length > 1 ? innings[0] : null;
  const batters = getActiveBatters(currentInnings);
  const bowler = getLeadBowler(currentInnings);

  if (!currentInnings && summaryMatch) {
    return (
      <SummaryFallbackOverlay
        match={summaryMatch}
        variant={variant}
        lastUpdated={lastUpdated}
      />
    );
  }

  if (error && !data && !summaryMatch) {
    return (
      <div className="fixed bottom-10 left-1/2 w-[1100px] -translate-x-1/2 rounded-3xl bg-red-950/90 px-8 py-5 text-white shadow-2xl ring-1 ring-red-400/40">
        <p className="text-lg font-black">CCE LIVE OVERLAY</p>
        <p className="mt-1 text-sm text-red-100">{error}</p>
      </div>
    );
  }

  if (!data || !currentInnings) {
    return (
      <div className="fixed bottom-10 left-1/2 w-[1100px] -translate-x-1/2 rounded-3xl bg-slate-950/90 px-8 py-5 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-lg font-black">CCE LIVE OVERLAY</p>
        <p className="mt-1 text-sm text-white/60">
          Waiting for STUMPS scorecard or match summary...
        </p>
      </div>
    );
  }

  if (variant === "scorebug") {
    return (
      <div className="fixed right-10 top-10 w-[460px] rounded-[2rem] bg-slate-950/92 p-5 text-white shadow-2xl ring-1 ring-emerald-300/30">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.22em]">
            Live
          </span>
          <span className="text-xs font-bold text-white/50">Updated {lastUpdated}</span>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
          {currentInnings.battingTeamName || "Batting Team"}
        </p>
        <div className="mt-2 flex items-end justify-between">
          <h1 className="text-5xl font-black leading-none">
            {scoreText(currentInnings)}
          </h1>
          <p className="text-xl font-black text-emerald-300">
            {oversText(currentInnings)}
          </p>
        </div>
        {previousInnings ? (
          <p className="mt-3 text-sm font-bold text-white/70">
            {previousInnings.battingTeamName}: {scoreText(previousInnings)} {oversText(previousInnings)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fixed bottom-10 left-1/2 w-[1500px] -translate-x-1/2 overflow-hidden rounded-[2rem] bg-slate-950/94 text-white shadow-2xl ring-1 ring-emerald-300/25">
      <div className="flex items-stretch">
        <div className="flex w-[360px] flex-col justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500 ring-4 ring-red-500/20" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">
              CCE Live
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight">
            {currentInnings.battingTeamName || "Batting Team"}
          </h2>
          <p className="mt-1 text-sm font-bold text-white/75">
            vs {currentInnings.bowlingTeamName || "Bowling Team"}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-between gap-8 px-8 py-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
              Score
            </p>
            <div className="mt-1 flex items-end gap-4">
              <h1 className="text-6xl font-black leading-none">
                {scoreText(currentInnings)}
              </h1>
              <p className="pb-1 text-2xl font-black text-emerald-300">
                {oversText(currentInnings)}
              </p>
            </div>
            {data.matchResult ? (
              <p className="mt-2 text-sm font-bold text-amber-200">
                {data.matchResult}
              </p>
            ) : (
              <p className="mt-2 text-sm font-bold text-white/50">
                {data.matchStatus || "Live score updating"}
              </p>
            )}
          </div>

          <div className="grid w-[420px] gap-2">
            <PlayerLine player={batters[0]} />
            <PlayerLine player={batters[1]} />
          </div>

          <div className="w-[310px] rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Bowler
            </p>
            <p className="mt-2 truncate text-xl font-black">
              {bowler?.playerName || "Bowler update soon"}
            </p>
            <p className="mt-1 text-sm font-bold text-white/60">
              {bowler?.overs || "0"} ov • {bowler?.runsConceded ?? 0}/{bowler?.wickets ?? 0}
            </p>
          </div>

          <div className="w-[130px] text-right">
            <p className="text-xs font-bold text-white/40">Updated</p>
            <p className="text-sm font-black text-white">{lastUpdated}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
