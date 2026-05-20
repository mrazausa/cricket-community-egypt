"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Batter = {
  playerName?: string;
  dismissalStatus?: string | null;
  runs?: number | null;
  balls?: number | null;
};

type Bowler = {
  playerName?: string;
  overs?: string | null;
  runsConceded?: number | null;
  wickets?: number | null;
};

type Innings = {
  battingTeamName?: string;
  bowlingTeamName?: string;
  teamScore?: number | null;
  wickets?: number | null;
  overs?: string | null;
  battingPlayers?: Batter[];
  bowlingPlayers?: Bowler[];
};

type ScorecardData = {
  matchId?: string;
  matchStatus?: string;
  matchResult?: string;
  matchTitle?: string;
  matchFormat?: string;
  innnings?: Innings[];
  innings?: Innings[];
  ininnings?: Innings[];
};

type ApiResponse = {
  success?: boolean;
  data?: ScorecardData;
  error?: string;
};

type SummaryTeam = {
  teamName?: string;
  teamScore?: string | null;
  teamLogo?: string | null;
};

type SummaryMatch = {
  matchId?: string;
  tournamentName?: string;
  matchTitle?: string;
  matchFormat?: string;
  matchStatus?: string;
  matchResult?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  teams?: SummaryTeam[];
};

type SummaryResponse = {
  liveMatches?: SummaryMatch[];
  upcomingMatches?: SummaryMatch[];
  completedMatches?: SummaryMatch[];
};

type Scene = "auto" | "intro" | "live" | "scorebug" | "full";
type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "top-center";
type EventType = "none" | "four" | "six" | "wicket";

type Snapshot = {
  team: string;
  runs: number;
  wkts: number;
  overs: string;
  balls: number;
  score: string;
};

type OverSummary = {
  over: number;
  team: string;
  score: string;
  runs: number | null;
  wickets: number | null;
  shownAt: number;
};

type BatterPairSnapshot = {
  names: string[];
  runs: number[];
  balls: number[];
  strikerIndex: number;
};

const REFRESH_MS = 3000;
const OVER_POPUP_MS = 4500;
const EVENT_POPUP_MS = 4200;

function clampScale(v: number) {
  if (!Number.isFinite(v)) return 0.9;
  return Math.min(Math.max(v, 0.55), 1.25);
}

function posClass(pos: Position, scene: Scene) {
  if (scene === "scorebug") {
    const map: Record<Position, string> = {
      "top-left": "left-8 top-8 origin-top-left",
      "top-right": "right-8 top-8 origin-top-right",
      "bottom-left": "bottom-8 left-8 origin-bottom-left",
      "bottom-right": "bottom-8 right-8 origin-bottom-right",
      "bottom-center": "right-8 top-8 origin-top-right",
      "top-center": "right-8 top-8 origin-top-right",
    };
    return map[pos] || map["top-right"];
  }

  const map: Record<Position, string> = {
    "top-left": "left-8 top-8 origin-top-left",
    "top-right": "right-8 top-8 origin-top-right",
    "bottom-left": "bottom-8 left-8 origin-bottom-left",
    "bottom-right": "bottom-8 right-8 origin-bottom-right",
    "bottom-center": "bottom-8 left-0 right-0 flex justify-center origin-bottom",
    "top-center": "left-0 right-0 top-8 flex justify-center origin-top",
  };

  return map[pos] || map["bottom-center"];
}

function transformFor(_pos: Position, scale: number) {
  return `scale(${scale})`;
}

function score(i?: Innings) {
  return `${i?.teamScore ?? 0}/${i?.wickets ?? 0}`;
}

function overs(i?: Innings) {
  return i?.overs ? `${i.overs} ov` : "0.0 ov";
}

function oversToBalls(v?: string | null) {
  const clean = String(v || "").trim();
  if (!clean) return 0;

  const [o, b = "0"] = clean.split(".");
  return (Number(o) || 0) * 6 + Math.min(Math.max(Number(b) || 0, 0), 5);
}

function completeOver(v?: string | null) {
  const balls = oversToBalls(v);
  return balls > 0 && balls % 6 === 0;
}

function overNo(v?: string | null) {
  return Math.floor(oversToBalls(v) / 6);
}

function snapshot(i?: Innings): Snapshot | null {
  if (!i) return null;

  return {
    team: i.battingTeamName || "Batting Team",
    runs: i.teamScore ?? 0,
    wkts: i.wickets ?? 0,
    overs: i.overs || "0",
    balls: oversToBalls(i.overs),
    score: `${i.teamScore ?? 0}/${i.wickets ?? 0}`,
  };
}


function inferInitialStrikerIndex(batters: Batter[], current?: Innings) {
  if (!batters?.length) return 0;

  // STUMPS endpoint has no explicit striker flag. On a clean first load,
  // first active batter is the safest default. Live polling then corrects it.
  return 0;
}

function activeBatters(i?: Innings) {
  const players = i?.battingPlayers || [];
  const active = players.filter((p) => {
    const status = String(p.dismissalStatus || "").toLowerCase();
    return status === "batting" || status.includes("not out") || !status;
  });
  return (active.length ? active : players).slice(0, 2);
}

function bowlerBalls(overs?: string | null) {
  return oversToBalls(overs);
}

function leadBowler(i?: Innings) {
  const bowlers = (i?.bowlingPlayers || []).filter(Boolean);
  if (!bowlers.length) return undefined;

  const totalBalls = oversToBalls(i?.overs);
  const overBall = totalBalls % 6;

  // During a live over, the current bowler is the one whose overs decimal
  // matches current over ball count, e.g. innings 3.5 => bowler .5.
  if (overBall > 0) {
    const exact = [...bowlers]
      .reverse()
      .find((b) => bowlerBalls(b?.overs) % 6 === overBall);
    if (exact) return exact;
  }

  // At exactly over end, STUMPS may not increment new bowler yet.
  // Use the bowler with highest balls bowled; if tie, latest in list.
  return [...bowlers].sort((a, b) => {
    const diff = bowlerBalls(b?.overs) - bowlerBalls(a?.overs);
    return diff !== 0 ? diff : bowlers.indexOf(b) - bowlers.indexOf(a);
  })[0];
}

function usefulInningsScore(i?: Innings) {
  const hasScore = i?.teamScore !== null && i?.teamScore !== undefined && Number(i.teamScore) >= 0;
  const hasOvers = Boolean(String(i?.overs || "").trim()) && oversToBalls(i?.overs) > 0;
  const hasBatters = Array.isArray(i?.battingPlayers) && i!.battingPlayers.length > 0;
  const hasBowlers = Array.isArray(i?.bowlingPlayers) && i!.bowlingPlayers.length > 0;
  return Number(hasScore) * 10 + Number(hasOvers) * 8 + Number(hasBatters) * 5 + Number(hasBowlers) * 3;
}

function currentLiveInnings(list?: Innings[]) {
  const innings = Array.isArray(list) ? list : [];
  if (!innings.length) return undefined;

  // STUMPS sometimes sends inning 2 as a blank placeholder during inning 1.
  // Never pick that blank last inning. Pick the most useful innings with real score/players.
  return [...innings]
    .filter((i) => usefulInningsScore(i) > 0)
    .sort((a, b) => usefulInningsScore(b) - usefulInningsScore(a))[0] || innings[0];
}

function formatOversFrom(matchFormat?: string, fallback = 20) {
  const text = String(matchFormat || "").toUpperCase();

  if (text.includes("T10")) return 10;
  if (text.includes("T15")) return 15;
  if (text.includes("T20")) return 20;

  const number = Number((text.match(/\d+/) || [])[0]);
  if (Number.isFinite(number) && number > 0 && number <= 100) return number;

  return fallback;
}

function projectedScore(i?: Innings, matchFormat?: string) {
  const runs = i?.teamScore ?? 0;
  const balls = oversToBalls(i?.overs);
  const maxOvers = formatOversFrom(matchFormat, 20);

  if (!balls || !runs) return "-";

  const projected = Math.round((runs / balls) * maxOvers * 6);
  return String(projected);
}

function currentRunRate(i?: Innings) {
  const runs = i?.teamScore ?? 0;
  const balls = oversToBalls(i?.overs);

  if (!balls) return "-";

  return ((runs * 6) / balls).toFixed(2);
}

function findLogoForTeam(summaryMatch: SummaryMatch | null, teamName?: string) {
  if (!teamName) return "";
  const lower = teamName.toLowerCase().trim();

  return (
    summaryMatch?.teams?.find((team) => team.teamName?.toLowerCase().trim() === lower)?.teamLogo || ""
  );
}

function TeamLogo({
  name,
  logo,
  size = "sm",
}: {
  name?: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg" ? "h-24 w-24" : size === "md" ? "h-10 w-10" : "h-8 w-8";

  if (!logo) {
    return (
      <div
        className={`${cls} grid shrink-0 place-items-center rounded-full bg-white/15 text-xs font-black text-white ring-1 ring-white/20`}
      >
        {(name || "T").slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={name || "Team"}
      className={`${cls} shrink-0 rounded-full bg-white object-contain p-1 shadow-lg ring-2 ring-cyan-300/70`}
    />
  );
}

function BatterLine({ p }: { p?: Batter; isStriker?: boolean }) {
  const name = p?.playerName || "Batter";
  return (
    <div className="flex h-[31px] items-center justify-between rounded-xl bg-white/10 px-3 transition-all">
      <span className="truncate text-[14px] font-black text-white">{name}</span>
      <span className="shrink-0 pl-2 text-[14px] font-black text-emerald-300">
        {p?.runs ?? "-"}
        <span className="text-white/60">({p?.balls ?? "-"})</span>
      </span>
    </div>
  );
}

function SummaryTeamMini({
  team,
  align = "left",
}: {
  team?: SummaryTeam;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : ""}`}>
      <TeamLogo name={team?.teamName} logo={team?.teamLogo} size="sm" />
      <div className={`${align === "right" ? "text-right" : "text-left"} min-w-0`}>
        <p className="truncate text-[14px] font-black text-white">{team?.teamName || "Team"}</p>
        <p className="text-[12px] font-black text-emerald-300">{team?.teamScore || "-"}</p>
      </div>
    </div>
  );
}

function EventGraphic({ event }: { event: EventType }) {
  if (event === "none") return null;

  const isSix = event === "six";
  const isFour = event === "four";
  const label = isSix ? "6" : isFour ? "4" : "W";
  const word = isSix ? "SIX!" : isFour ? "FOUR!" : "WICKET!";
  const tone = isSix ? "gold" : isFour ? "blue" : "red";

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden">
      <div className={`cce-premium-event cce-premium-${tone}`}>
        <div className="cce-stadium-glow" />
        <div className="cce-energy-ring" />
        <div className="cce-energy-ring cce-energy-ring-2" />

        <div className="cce-shards">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} style={{ ["--i" as any]: i }} />
          ))}
        </div>

        <div className="cce-number-wrap">
          <div className="cce-number-shine" />
          <div className="cce-big-number">{label}</div>
        </div>

        <div className="cce-logo-medal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cce-logo.png"
            alt="CCE"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "grid";
            }}
          />
          <span className="cce-logo-fallback">CCE</span>
        </div>

        <div className="cce-brush-text">
          <span>{word}</span>
        </div>
      </div>

      <style jsx global>{`
        .cce-premium-event {
          position: relative;
          width: min(700px, 82vw);
          height: min(470px, 62vh);
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 46px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(2, 6, 23, 0.22);
          backdrop-filter: blur(1.5px);
          animation: ccePremiumEnter 0.45s cubic-bezier(0.2, 1.25, 0.25, 1) both;
        }

        .cce-premium-blue {
          box-shadow: 0 0 130px rgba(37, 99, 235, 0.48);
        }
        .cce-premium-gold {
          box-shadow: 0 0 140px rgba(245, 158, 11, 0.58);
        }
        .cce-premium-red {
          box-shadow: 0 0 125px rgba(239, 68, 68, 0.52);
        }

        .cce-stadium-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 8% 72%, rgba(255,255,255,0.42), transparent 8%),
            radial-gradient(circle at 92% 72%, rgba(255,255,255,0.38), transparent 8%),
            linear-gradient(to top, rgba(22, 101, 52, 0.22), transparent 34%),
            radial-gradient(circle at center, rgba(255,255,255,0.16), transparent 46%);
          opacity: 0.82;
        }

        .cce-energy-ring {
          position: absolute;
          width: 560px;
          height: 560px;
          border-radius: 999px;
          opacity: 0.78;
          animation: cceRing 1.1s ease-out both;
        }
        .cce-energy-ring-2 {
          animation-delay: 0.12s;
          transform: scale(0.8);
        }
        .cce-premium-blue .cce-energy-ring {
          background: radial-gradient(circle, rgba(59,130,246,0.48), transparent 62%);
        }
        .cce-premium-gold .cce-energy-ring {
          background: radial-gradient(circle, rgba(251,191,36,0.52), transparent 62%);
        }
        .cce-premium-red .cce-energy-ring {
          background: radial-gradient(circle, rgba(248,113,113,0.48), transparent 62%);
        }

        .cce-shards {
          position: absolute;
          inset: 0;
        }
        .cce-shards span {
          --angle: calc(var(--i) * 13deg);
          position: absolute;
          left: 50%;
          top: 50%;
          width: 8px;
          height: 46px;
          border-radius: 999px;
          opacity: 0;
          transform: rotate(var(--angle)) translateY(-24px) scaleY(0.25);
          animation: cceShardBlast 1.25s ease-out forwards;
          animation-delay: calc(var(--i) * 0.014s);
        }
        .cce-premium-blue .cce-shards span {
          background: linear-gradient(#fff, #2563eb);
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.95);
        }
        .cce-premium-gold .cce-shards span {
          background: linear-gradient(#fff, #f59e0b);
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.95);
        }
        .cce-premium-red .cce-shards span {
          background: linear-gradient(#fff, #ef4444);
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.95);
        }

        .cce-number-wrap {
          position: relative;
          z-index: 6;
          display: grid;
          place-items: center;
        }

        .cce-number-shine {
          position: absolute;
          z-index: 7;
          inset: -60px -120px;
          transform: rotate(-18deg) translateX(-70%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent);
          animation: cceNumberShine 1.35s 0.18s ease-out both;
          pointer-events: none;
        }

        .cce-big-number {
          position: relative;
          z-index: 6;
          margin-top: -72px;
          margin-left: -36px;
          font-size: clamp(190px, 25vw, 320px);
          line-height: 0.72;
          font-weight: 1000;
          letter-spacing: -0.08em;
          color: transparent;
          -webkit-text-stroke: 7px rgba(255, 255, 255, 0.98);
          filter: drop-shadow(0 24px 28px rgba(0,0,0,0.46));
          text-shadow:
            0 0 18px rgba(255,255,255,0.42),
            0 22px 40px rgba(0,0,0,0.5);
          animation: cceNumberPunch 0.65s cubic-bezier(0.2, 1.35, 0.25, 1) both;
        }
        .cce-premium-blue .cce-big-number {
          background: linear-gradient(145deg, #001f72 0%, #0b5cff 44%, #9ed8ff 58%, #00184f 100%);
          -webkit-background-clip: text;
        }
        .cce-premium-gold .cce-big-number {
          background: linear-gradient(145deg, #92400e 0%, #f59e0b 36%, #fff176 58%, #b45309 100%);
          -webkit-background-clip: text;
        }
        .cce-premium-red .cce-big-number {
          background: linear-gradient(145deg, #ef4444, #fecaca, #7f1d1d);
          -webkit-background-clip: text;
        }

        .cce-logo-medal {
          position: absolute;
          z-index: 20;
          right: 92px;
          bottom: 96px;
          width: 148px;
          height: 148px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 999px;
          background: #ffffff;
          border: 5px solid rgba(255,255,255,0.98);
          box-shadow:
            0 18px 38px rgba(0,0,0,0.42),
            0 0 32px rgba(255,255,255,0.65);
          animation: cceLogoPop 0.75s 0.14s cubic-bezier(0.2, 1.4, 0.2, 1) both;
        }
        .cce-logo-medal img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 999px;
        }
        .cce-logo-fallback {
          display: none;
          width: 100%;
          height: 100%;
          place-items: center;
          font-size: 42px;
          font-weight: 1000;
          color: #0b4aa2;
        }

        .cce-brush-text {
          position: absolute;
          z-index: 10;
          bottom: 42px;
          left: 50%;
          min-width: 430px;
          padding: 13px 40px 15px;
          text-align: center;
          background:
            linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.98) 12%, rgba(255,255,255,0.98) 88%, transparent 100%);
          clip-path: polygon(0 30%, 8% 0, 94% 8%, 100% 64%, 91% 100%, 9% 88%);
          animation: cceBrushIn 0.55s 0.2s ease-out both;
        }
        .cce-brush-text span {
          font-size: clamp(42px, 6vw, 70px);
          font-weight: 1000;
          font-style: italic;
          letter-spacing: 0.03em;
        }
        .cce-premium-blue .cce-brush-text span { color: #0b4aa2; }
        .cce-premium-gold .cce-brush-text span { color: #d97706; }
        .cce-premium-red .cce-brush-text span { color: #dc2626; }

        @keyframes cceNumberShine {
          from { transform: rotate(-18deg) translateX(-85%); opacity: 0; }
          25% { opacity: 1; }
          to { transform: rotate(-18deg) translateX(85%); opacity: 0; }
        }

        @keyframes ccePremiumEnter {
          from { opacity: 0; transform: scale(0.72) translateY(42px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cceRing {
          from { transform: scale(0.45); opacity: 0; }
          62% { opacity: 0.85; }
          to { transform: scale(1.22); opacity: 0.18; }
        }
        @keyframes cceShardBlast {
          0% { opacity: 0; transform: rotate(var(--angle)) translateY(-18px) scaleY(0.25); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle)) translateY(-270px) scaleY(1); }
        }
        @keyframes cceNumberPunch {
          from { opacity: 0; transform: scale(0.55) rotate(-6deg); }
          72% { opacity: 1; transform: scale(1.08) rotate(1deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes cceLogoPop {
          from { opacity: 0; transform: scale(0.25) rotate(-18deg); }
          70% { opacity: 1; transform: scale(1.08) rotate(4deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes cceBrushIn {
          from { opacity: 0; transform: translateX(-50%) translateY(28px) rotate(-8deg) scaleX(0.6); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) rotate(-2deg) scaleX(1); }
        }
      `}</style>
    </div>
  );
}

function OverPopup({
  data,
  scale,
  current,
  batters,
  bowler,
}: {
  data: OverSummary | null;
  scale: number;
  current?: Innings;
  batters?: Batter[];
  bowler?: Bowler;
}) {
  if (!data) return null;

  const overNo = data?.over || Math.floor(oversToBalls(current?.overs) / 6);
  const scoreText = data?.score || score(current);
  const teamName = data?.team || current?.battingTeamName || "Batting Team";
  const bats = batters || activeBatters(current);
  const lead = bowler || leadBowler(current);

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[12%] z-40 w-[min(1120px,calc(100vw-80px))] rounded-[1.9rem] border border-emerald-300/20 bg-slate-950/38 px-8 py-6 text-white shadow-2xl backdrop-blur-[1px]"
      style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }}
    >
      <div className="grid grid-cols-[1fr_430px] items-center gap-8">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.38em] text-emerald-300">
            End of Over {overNo}
          </p>
          <h2 className="mt-2 text-5xl font-black leading-none">
            {teamName} {scoreText}
          </h2>
          <p className="mt-2 text-base font-bold text-white/70">
            {overNo}.0 overs completed
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-white/6 px-5 py-3.5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Batters
            </p>
            <p className="mt-1 text-xl font-black">
              {bats?.[0]?.playerName || "Batter"} {bats?.[0] ? `${bats[0].runs ?? "-"}(${bats[0].balls ?? "-"})` : ""}
            </p>
            <p className="text-base font-bold text-white/65">
              {bats?.[1]?.playerName || "Batter"} {bats?.[1] ? `${bats[1].runs ?? "-"}(${bats[1].balls ?? "-"})` : ""}
            </p>
          </div>

          <div className="rounded-2xl bg-white/6 px-5 py-3.5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-200">
              Bowling
            </p>
            <p className="mt-1 text-xl font-black">
              {lead?.playerName || "Bowler"}
              <span className="ml-2 text-base text-white/65">
                {lead ? `${lead.overs || "0"} ov • ${lead.runsConceded ?? 0}/${lead.wickets ?? 0}` : ""}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/6 px-5 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">This Over</p>
          <p className="mt-1 text-3xl font-black text-emerald-300">{data?.runs ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-white/6 px-5 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Wickets</p>
          <p className="mt-1 text-3xl font-black text-red-300">{data?.wickets ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

function IntroScene({ match, scale }: { match: SummaryMatch | null; scale: number }) {
  const a = match?.teams?.[0];
  const b = match?.teams?.[1];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent">
      <div
        className="relative w-[min(1180px,calc(100vw-100px))] overflow-hidden rounded-[2rem] border border-white/35 bg-cyan-950/45 px-10 py-10 text-center text-white shadow-2xl backdrop-blur-sm"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-2xl font-black text-cyan-900 shadow-xl">
          CCE
        </div>
        <div className="mx-auto inline-flex rounded-2xl bg-white px-7 py-3 text-2xl font-black uppercase tracking-tight text-slate-950">
          Azhar Cricket Trophy 2026
        </div>
        <div className="mt-10 flex items-center justify-center gap-28">
          <div className="grid justify-items-center gap-4">
            <TeamLogo name={a?.teamName} logo={a?.teamLogo} size="lg" />
            <p className="rounded-xl bg-cyan-500 px-5 py-2 text-lg font-black uppercase">
              {a?.teamName || "Team A"}
            </p>
          </div>
          <div className="rounded-full bg-white/90 px-7 py-5 text-3xl font-black text-slate-950">VS</div>
          <div className="grid justify-items-center gap-4">
            <TeamLogo name={b?.teamName} logo={b?.teamLogo} size="lg" />
            <p className="rounded-xl bg-cyan-500 px-5 py-2 text-lg font-black uppercase">
              {b?.teamName || "Team B"}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 w-[820px] max-w-full rounded-2xl bg-white px-8 py-5 text-slate-950 shadow-xl">
          <p className="text-xl font-black uppercase">{match?.matchTitle || "Final Match"}</p>
          <p className="mt-2 text-lg font-bold">{match?.venue || "Live from Al-Azhar Ground, Cairo"}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryOverlay({
  match,
  scene,
  position,
  scale,
  updated,
}: {
  match: SummaryMatch;
  scene: Scene;
  position: Position;
  scale: number;
  updated: string;
}) {
  const a = match.teams?.[0];
  const b = match.teams?.[1];

  if (scene === "intro") return <IntroScene match={match} scale={scale} />;

  if (scene === "scorebug") {
    return (
      <div
        className={`fixed ${posClass(position, scene)} w-[420px] rounded-[1.4rem] bg-slate-950/84 p-4 text-white shadow-2xl ring-1 ring-emerald-300/30 backdrop-blur-xl`}
        style={{ transform: transformFor(position, scale) }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">
            Live
          </span>
          <span className="text-[11px] font-bold text-white/50">Updated {updated}</span>
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">
          CCE Live Score
        </p>
        <h1 className="mt-1 text-xl font-black leading-tight">
          {match.matchTitle || `${a?.teamName || "Team A"} vs ${b?.teamName || "Team B"}`}
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SummaryTeamMini team={a} />
          <SummaryTeamMini team={b} align="right" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${posClass(position, scene)} h-[96px] w-[min(1540px,calc(100vw-110px))] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/72 text-white shadow-2xl backdrop-blur-xl`}
      style={{ transform: transformFor(position, scale) }}
    >
      <div className="flex h-full items-center">
        <div className="flex h-full w-[245px] flex-col justify-center bg-gradient-to-r from-emerald-500/95 to-emerald-800/95 px-5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-lg shadow-red-500/40" />
            <span className="text-[11px] font-black uppercase tracking-[0.32em] text-white">
              CCE LIVE
            </span>
          </div>

          <h2 className="mt-1 truncate text-[17px] font-black leading-tight text-white">
            {a?.teamName || "Team A"}
          </h2>

          <p className="truncate text-[13px] font-bold text-white/80">
            vs {b?.teamName || "Team B"}
          </p>
        </div>

        <div className="grid flex-1 grid-cols-[1fr_230px_210px_110px] items-center gap-4 px-5">
          <div className="grid grid-cols-2 items-center gap-4">
            <SummaryTeamMini team={a} />
            <SummaryTeamMini team={b} align="right" />
          </div>

          <div className="rounded-2xl bg-white/6 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Match Status
            </p>
            <p className="mt-1 truncate text-[17px] font-black leading-tight text-white">
              {match.matchStatus || "Live score updating"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/6 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Format
            </p>
            <p className="mt-1 truncate text-[17px] font-black leading-tight text-white">
              {match.matchFormat || "Match"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold text-white/45">Updated</p>
            <p className="text-[14px] font-black leading-tight text-white">{updated}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CricketScoreOverlay({
  matchId,
  scene = "auto",
  position = "bottom-center",
  scale = 0.9,
  event = "none",
  showOverSummary = true,
}: {
  matchId: string;
  scene?: Scene;
  position?: Position;
  scale?: number;
  event?: EventType;
  showOverSummary?: boolean;
}) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [summaryMatch, setSummaryMatch] = useState<SummaryMatch | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [overPopup, setOverPopup] = useState<OverSummary | null>(null);
  const [autoEvent, setAutoEvent] = useState<EventType>("none");

  const prevRef = useRef<Snapshot | null>(null);
  const shownOverRef = useRef<Set<string>>(new Set());
  const overTimerRef = useRef<number | null>(null);
  const eventTimerRef = useRef<number | null>(null);
  const prevBattersRef = useRef<BatterPairSnapshot | null>(null);
  const [strikerIndex, setStrikerIndex] = useState(0);

  const safeScale = clampScale(scale);
  const effectiveScene: Scene = scene === "auto" ? "live" : scene;
  const visibleEvent: EventType = event !== "none" ? event : autoEvent;

  useEffect(() => {
    if (!overPopup) return;

    const clearAt = overPopup.shownAt + OVER_POPUP_MS;
    const remaining = Math.max(0, clearAt - Date.now());

    const timer = window.setTimeout(() => setOverPopup(null), remaining);
    return () => window.clearTimeout(timer);
  }, [overPopup]);

  useEffect(() => {
    if (!overPopup || !data) return;

    const current = currentLiveInnings((data?.innings || data?.innnings || data?.ininnings || []) as Innings[]);
    const ballsNow = oversToBalls(current?.overs);

    // Hard guard: if next over has already reached ball 2 or more, remove summary.
    if (ballsNow > overPopup.over * 6 + 1) {
      setOverPopup(null);
    }
  }, [data, overPopup]);

  function triggerEvent(nextEvent: EventType) {
    if (nextEvent === "none") return;

    setAutoEvent(nextEvent);

    if (eventTimerRef.current) window.clearTimeout(eventTimerRef.current);
    eventTimerRef.current = window.setTimeout(() => setAutoEvent("none"), EVENT_POPUP_MS);
  }

  function showOverPopup(popup: OverSummary) {
    if (!showOverSummary) return;

    setOverPopup(popup);

    if (overTimerRef.current) window.clearTimeout(overTimerRef.current);
    overTimerRef.current = window.setTimeout(() => setOverPopup(null), OVER_POPUP_MS);
  }

  function updateStrikerFromBatters(i?: Innings) {
    const bats = activeBatters(i);
    if (bats.length < 2) {
      setStrikerIndex(0);
      return;
    }

    const url = new URL(window.location.href);
    const forcedStriker = url.searchParams.get("striker")?.trim().toLowerCase();
    if (forcedStriker) {
      const forcedIndex = bats.findIndex((b) =>
        String(b?.playerName || "").toLowerCase().includes(forcedStriker)
      );
      if (forcedIndex >= 0) {
        setStrikerIndex(forcedIndex);
        return;
      }
    }

    const storageKey = `cce_overlay_striker_${matchId}`;
    const prev = prevBattersRef.current || (() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as BatterPairSnapshot) : null;
      } catch {
        return null;
      }
    })();

    let nextIndex = prev?.strikerIndex ?? inferInitialStrikerIndex(bats, i);

    const samePair =
      prev &&
      prev.names[0] === (bats[0]?.playerName || "") &&
      prev.names[1] === (bats[1]?.playerName || "");

    if (samePair) {
      const deltas = bats.map((b, idx) => ({
        idx,
        runDiff: Number(b?.runs || 0) - Number(prev.runs[idx] || 0),
        ballDiff: Number(b?.balls || 0) - Number(prev.balls[idx] || 0),
      }));

      const facedList = deltas.filter((d) => d.ballDiff > 0);

      if (facedList.length === 1) {
        const faced = facedList[0];
        const totalBalls = oversToBalls(i?.overs);
        const isOverEnd = totalBalls > 0 && totalBalls % 6 === 0;

        // After a legal delivery:
        // odd run rotates strike; even/dot keeps same striker.
        nextIndex = faced.runDiff % 2 !== 0 ? (faced.idx === 0 ? 1 : 0) : faced.idx;

        // Over end rotates strike again.
        if (isOverEnd) nextIndex = nextIndex === 0 ? 1 : 0;
      } else if (facedList.length > 1) {
        // Polling missed multiple deliveries. Use the batter whose ball count changed last most likely:
        // choose the batter with the highest ballDiff; if tied, use STUMPS active order.
        const sorted = [...facedList].sort((a, b) => {
          const byBalls = b.ballDiff - a.ballDiff;
          if (byBalls !== 0) return byBalls;
          return b.runDiff - a.runDiff;
        });
        nextIndex = sorted[0]?.idx ?? nextIndex;
      }
    } else if (prev) {
      // New batsman came in after wicket. Preserve striker if the old striker is still present,
      // otherwise new batsman is usually on strike after wicket.
      const oldStrikerName = prev.names[prev.strikerIndex];
      const carriedIndex = bats.findIndex((b) => (b?.playerName || "") === oldStrikerName);
      nextIndex = carriedIndex >= 0 ? carriedIndex : 1;
    }

    // Extra sanity from scorecard live feed:
    // If one batsman has just 1 ball and the other has a long innings, and total balls just advanced,
    // the new/low-ball batter is often the striker after a wicket/rotation.
    // Do not override strong delta history except on fresh load.
    if (!prev) {
      const b0Balls = Number(bats[0]?.balls || 0);
      const b1Balls = Number(bats[1]?.balls || 0);
      if (Math.abs(b0Balls - b1Balls) >= 8) {
        nextIndex = b0Balls < b1Balls ? 0 : 1;
      }
    }

    const snapshot: BatterPairSnapshot = {
      names: [bats[0]?.playerName || "", bats[1]?.playerName || ""],
      runs: [Number(bats[0]?.runs || 0), Number(bats[1]?.runs || 0)],
      balls: [Number(bats[0]?.balls || 0), Number(bats[1]?.balls || 0)],
      strikerIndex: nextIndex,
    };

    prevBattersRef.current = snapshot;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {}

    setStrikerIndex(nextIndex);
  }

  function detectAutomaticScenes(i?: Innings) {
    const cur = snapshot(i);
    const prev = prevRef.current;

    if (!cur) return;

    if (prev && prev.team === cur.team && cur.balls > prev.balls) {
      const runDiff = cur.runs - prev.runs;
      const wicketDiff = cur.wkts - prev.wkts;

      if (wicketDiff > 0) {
        triggerEvent("wicket");
      } else if (runDiff === 6) {
        triggerEvent("six");
      } else if (runDiff === 4) {
        triggerEvent("four");
      }

      if (completeOver(cur.overs) && cur.balls === prev.balls + 1) {
        const n = overNo(cur.overs);
        const key = `${matchId}-${cur.team}-${n}`;

        if (!shownOverRef.current.has(key)) {
          shownOverRef.current.add(key);
          showOverPopup({
            over: n,
            team: cur.team,
            score: cur.score,
            runs: cur.runs - prev.runs,
            wickets: cur.wkts - prev.wkts,
            shownAt: Date.now(),
          });
        }
      }
    }

    prevRef.current = cur;
  }

  async function loadSummary() {
    try {
      const res = await fetch("/api/stumps/live-summary", { cache: "no-store" });
      const json = (await res.json()) as SummaryResponse;
      const all = [
        ...(json.liveMatches || []),
        ...(json.upcomingMatches || []),
        ...(json.completedMatches || []),
      ];
      setSummaryMatch(all.find((m) => m.matchId === matchId) || null);
    } catch {
      setSummaryMatch(null);
    }
  }

  async function load() {
    try {
      await loadSummary();

      // Main source for batsman, bowler, striker star and ball-by-ball is scorecard. Summary is only fallback.
      const res = await fetch(`/api/stumps/scorecard/${matchId}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse;

      const scorecard = json.data || null;
      const innings = scorecard?.innings || scorecard?.innnings || scorecard?.ininnings || [];
      const current = currentLiveInnings(innings);

      if (scorecard && innings.length > 0) {
        setData(scorecard);
        detectAutomaticScenes(current);
      } else {
        setData(scorecard);
      }

      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch {
      await loadSummary();
    }
  }

  useEffect(() => {
    load();
    const t = window.setInterval(load, REFRESH_MS);
    return () => {
      window.clearInterval(t);
      if (overTimerRef.current) window.clearTimeout(overTimerRef.current);
      if (eventTimerRef.current) window.clearTimeout(eventTimerRef.current);
    };
  }, [matchId]);

  const innings = useMemo(() => data?.innings || data?.innnings || data?.ininnings || [], [data]);
  const current = currentLiveInnings(innings);
  const previous = innings.find((inn) => inn !== current) || null;
  const batters = activeBatters(current);
  const bowler = leadBowler(current);

  const battingLogo = findLogoForTeam(summaryMatch, current?.battingTeamName);
  const bowlingLogo = findLogoForTeam(summaryMatch, current?.bowlingTeamName);
  const matchFormat = data?.matchFormat || summaryMatch?.matchFormat || "";

  const currentBallsForPopup = oversToBalls(current?.overs);
  const overPopupAge = overPopup ? Date.now() - overPopup.shownAt : Number.POSITIVE_INFINITY;

  // Show end-over card only briefly after the completed over.
  // If the innings has moved into ball 2+ of the next over, force-hide it.
  const popupForRender =
    overPopup &&
    overPopupAge < OVER_POPUP_MS &&
    currentBallsForPopup <= overPopup.over * 6 + 1
      ? overPopup
      : null;

  if (effectiveScene === "intro") {
    return (
      <>
        <IntroScene match={summaryMatch} scale={safeScale} />
        <EventGraphic event={visibleEvent} />
      </>
    );
  }

  if (!current && summaryMatch) {
    return (
      <>
        <SummaryOverlay
          match={summaryMatch}
          scene={effectiveScene}
          position={position}
          scale={safeScale}
          updated={lastUpdated}
        />
        <OverPopup data={overPopup} scale={safeScale} />
        <EventGraphic event={visibleEvent} />
      </>
    );
  }

  if (!current) {
    return (
      <div className="fixed bottom-8 left-1/2 w-[min(900px,calc(100vw-80px))] -translate-x-1/2 rounded-3xl bg-slate-950/80 px-8 py-5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
        <p className="text-lg font-black">CCE LIVE OVERLAY</p>
        <p className="mt-1 text-sm text-white/60">Waiting for STUMPS scorecard or match summary...</p>
      </div>
    );
  }

  const isCompleted =
    String(data?.matchStatus || "").toLowerCase().includes("completed") || Boolean(data?.matchResult);

  if (effectiveScene === "scorebug") {
    return (
      <>
        <div
          className={`fixed ${posClass(position, effectiveScene)} w-[420px] rounded-[1.4rem] bg-slate-950/84 p-4 text-white shadow-2xl ring-1 ring-emerald-300/30 backdrop-blur-xl`}
          style={{ transform: transformFor(position, safeScale) }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${
                isCompleted ? "bg-amber-400 text-slate-950" : "bg-red-600 text-white"
              }`}
            >
              {isCompleted ? "Result" : "Live"}
            </span>
            <span className="text-[11px] font-bold text-white/50">Updated {lastUpdated}</span>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">
            {current.battingTeamName || "Batting Team"}
          </p>
          <div className="mt-1 flex items-end justify-between">
            <h1 className="text-5xl font-black leading-none">{score(current)}</h1>
            <p className="text-lg font-black text-emerald-300">{overs(current)}</p>
          </div>
          {previous ? (
            <p className="mt-2 text-sm font-bold text-white/70">
              {previous.battingTeamName}: {score(previous)} {overs(previous)}
            </p>
          ) : null}
          {data?.matchResult ? <p className="mt-2 text-xs font-black text-amber-200">{data.matchResult}</p> : null}
        </div>
        <OverPopup data={overPopup} scale={safeScale} />
        <EventGraphic event={visibleEvent} />
      </>
    );
  }

  return (
    <>
      <div
        className={`fixed ${posClass(position, effectiveScene)} h-[110px] w-[min(1500px,calc(100vw-40px))] animate-[scorebarGlow_3s_ease-in-out_infinite] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/72 text-white shadow-2xl backdrop-blur-xl`}
        style={{ transform: transformFor(position, safeScale) }}
      >
        <div className="flex h-full items-center">
          <div className="flex h-full w-[300px] items-center gap-3 bg-gradient-to-r from-emerald-500/95 to-emerald-800/95 px-5">
            <TeamLogo name={current.battingTeamName} logo={battingLogo} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    isCompleted ? "bg-amber-300" : "animate-pulse bg-red-500 shadow-lg shadow-red-500/40"
                  }`}
                />
                <span className="text-[10px] font-black uppercase tracking-[0.26em]">
                  {isCompleted ? "CCE RESULT" : "CCE LIVE"}
                </span>
              </div>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/75">Batting Side</p>
              <h2 className="truncate text-[18px] font-black leading-tight">
                {current.battingTeamName || "Batting Team"}
              </h2>
              <p className="truncate text-[12px] font-bold text-white/80">
                vs {current.bowlingTeamName || "Bowling Team"}
              </p>
            </div>
          </div>

          <div className="flex w-[150px] items-center justify-center px-3">
            <div className="text-center">
              <p className="text-[38px] font-black leading-none text-white">{score(current)}</p>
              <p className="mt-1 text-[14px] font-black text-emerald-300">{overs(current)}</p>
            </div>
          </div>

          <div className="grid w-[340px] gap-2 px-3">
            <BatterLine p={batters[0]} />
            <BatterLine p={batters[1]} />
          </div>

          <div className="w-[260px] rounded-2xl bg-white/6 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Bowler</p>
            <p className="mt-1 truncate text-[17px] font-black">{bowler?.playerName || "Bowler update soon"}</p>
            <p className="text-[12px] font-bold text-white/60">
              {bowler?.overs || "0"} ov • {bowler?.runsConceded ?? 0}/{bowler?.wickets ?? 0}
            </p>
          </div>

          <div className="grid w-[270px] grid-cols-3 gap-2 px-3">
            <div className="rounded-xl bg-white/6 px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/45">CRR</p>
              <p className="text-[15px] font-black text-white">{currentRunRate(current)}</p>
            </div>
            <div className="rounded-xl bg-white/6 px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/45">Proj</p>
              <p className="text-[15px] font-black text-emerald-300">{projectedScore(current, matchFormat)}</p>
            </div>
            <div className="rounded-xl bg-white/6 px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/45">Format</p>
              <p className="text-[15px] font-black text-white">{matchFormat || "-"}</p>
            </div>
          </div>

          <div className="flex h-full w-[180px] items-center justify-end gap-3 bg-gradient-to-l from-rose-700/90 via-rose-800/45 to-transparent px-4 text-right">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-100">Bowling Side</p>
              <p className="truncate text-[17px] font-black leading-tight text-white">
                {current.bowlingTeamName || "Bowling Team"}
              </p>
              <p className="text-[9px] font-bold text-white/55">Updated {lastUpdated}</p>
            </div>
            <TeamLogo name={current.bowlingTeamName} logo={bowlingLogo} size="md" />
          </div>
        </div>
      </div>

      <OverPopup data={popupForRender} scale={safeScale} current={current} batters={batters} bowler={bowler} />
      <EventGraphic event={visibleEvent} />

      <style jsx global>{`
        @keyframes scorebarGlow {
          0%,
          100% {
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
          }
          50% {
            box-shadow: 0 18px 60px rgba(16, 185, 129, 0.2);
          }
        }
      `}</style>
    </>
  );
}
