"use client";

import { useEffect, useMemo, useState } from "react";

type Team = {
  teamName?: string;
  teamScore?: string | null;
  teamLogo?: string | null;
};

type Match = {
  matchId: string;
  tournamentName?: string;
  matchTitle?: string;
  matchStatus?: string;
  matchDate?: string;
  matchTime?: string;
  matchFormat?: string;
  venue?: string;
  teams?: Team[];
};

type LiveSummary = {
  liveMatches?: Match[];
  upcomingMatches?: Match[];
  completedMatches?: Match[];
};

const scenes = [
  { value: "live", label: "Lower Third" },
  { value: "auto", label: "Auto Scene" },
  { value: "scorebug", label: "Scorebug" },
  { value: "intro", label: "Intro Scene" },
];

const positions = [
  "bottom-center",
  "top-center",
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
];

const events = [
  { value: "none", label: "No Event" },
  { value: "four", label: "FOUR" },
  { value: "six", label: "SIX" },
  { value: "wicket", label: "WICKET" },
];

function getBaseUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function matchTitle(match?: Match | null) {
  if (!match) return "Select match";
  const a = match.teams?.[0]?.teamName || "Team A";
  const b = match.teams?.[1]?.teamName || "Team B";
  return match.matchTitle && match.matchTitle !== "Match"
    ? `${match.matchTitle} • ${a} vs ${b}`
    : `${a} vs ${b}`;
}

function shortStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("progress") || s.includes("live")) return "LIVE";
  if (s.includes("complete") || s.includes("result")) return "COMPLETED";
  if (s.includes("upcoming") || s.includes("schedule")) return "UPCOMING";
  return status || "MATCH";
}

function TeamLogo({ team }: { team?: Team }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
      {team?.teamLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.teamLogo} alt={team.teamName || "team"} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-black text-slate-500">{(team?.teamName || "T").slice(0, 1)}</span>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-emerald-400"
      >
        {options.map((item) => {
          const value = typeof item === "string" ? item : item.value;
          const label = typeof item === "string" ? item : item.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function OverlayControlPage() {
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [matchId, setMatchId] = useState("");
  const [scene, setScene] = useState("live");
  const [position, setPosition] = useState("bottom-center");
  const [scale, setScale] = useState("1");
  const [event, setEvent] = useState("none");
  const [summaryEnabled, setSummaryEnabled] = useState(true);
  const [copied, setCopied] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scorecard, setScorecard] = useState<any>(null);
  const [strikerOverride, setStrikerOverride] = useState("");

  async function loadMatches() {
    try {
      setLoading(true);
      setLoadError("");

      const res = await fetch("/api/stumps/live-summary", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setSummary({
        liveMatches: json?.liveMatches || json?.data?.liveMatches || [],
        upcomingMatches: json?.upcomingMatches || json?.data?.upcomingMatches || [],
        completedMatches: json?.completedMatches || json?.data?.completedMatches || [],
      });
    } catch (err) {
      console.error("Overlay control live-summary fetch failed:", err);
      setLoadError("Could not load STUMPS match list. You can still enter Match ID manually.");
      setSummary({ liveMatches: [], upcomingMatches: [], completedMatches: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
    const timer = window.setInterval(loadMatches, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const matches = useMemo(() => {
    return [
      ...(summary?.liveMatches || []),
      ...(summary?.upcomingMatches || []),
      ...(summary?.completedMatches || []).slice(0, 12),
    ];
  }, [summary]);

  useEffect(() => {
    if (!matchId && matches[0]?.matchId) setMatchId(matches[0].matchId);
  }, [matches, matchId]);

  const selectedMatch = matches.find((m) => m.matchId === matchId) || null;

  const overlayUrl = useMemo(() => {
    if (!matchId) return "";
    const params = new URLSearchParams();
    params.set("scene", scene);
    params.set("position", position);
    params.set("scale", scale || "1");
    if (event !== "none") params.set("event", event);
    if (!summaryEnabled) params.set("summary", "off");
    return `${getBaseUrl()}/en/overlay/${matchId}?${params.toString()}`;
  }, [matchId, scene, position, scale, event, summaryEnabled]);

  const liveScoreUrl = useMemo(() => {
    if (!matchId) return "";
    return `${getBaseUrl()}/en/live/${matchId}`;
  }, [matchId]);

  const apiDebugUrl = useMemo(() => {
    if (!matchId) return "";
    return `${getBaseUrl()}/api/stumps/scorecard/${matchId}?debug=1`;
  }, [matchId]);

  async function loadScorecardForSelected() {
    if (!matchId) return;

    try {
      const res = await fetch(`/api/stumps/scorecard/${matchId}`, { cache: "no-store" });
      const json = await res.json();
      setScorecard(json?.data || null);
    } catch {
      setScorecard(null);
    }

    try {
      setStrikerOverride(window.localStorage.getItem(`cce_striker_override_${matchId}`) || "");
    } catch {
      setStrikerOverride("");
    }
  }

  useEffect(() => {
    loadScorecardForSelected();
    const timer = window.setInterval(loadScorecardForSelected, 5000);
    return () => window.clearInterval(timer);
  }, [matchId]);

  const activeBatters = useMemo(() => {
    const innings = Array.isArray(scorecard?.innings) ? scorecard.innings : [];
    const activeInnings =
      [...innings].reverse().find((i: any) => Number(i?.totalBalls || 0) > 0 || Number(i?.teamScore || 0) > 0) ||
      innings[0] ||
      null;

    const battingPlayers = Array.isArray(activeInnings?.battingPlayers) ? activeInnings.battingPlayers : [];
    const currentlyBatting = battingPlayers.filter((p: any) =>
      String(p?.dismissalStatus || "").toLowerCase().includes("batting")
    );

    return (currentlyBatting.length >= 2 ? currentlyBatting : battingPlayers).slice(0, 2);
  }, [scorecard]);

  async function copyUrl(label: string, url = overlayUrl) {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  }

  function openPreview(url = overlayUrl) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function eventUrl(nextEvent: string) {
    const url = new URL(overlayUrl);
    if (nextEvent === "none") url.searchParams.delete("event");
    else url.searchParams.set("event", nextEvent);
    return url.toString();
  }

  function setManualStriker(name?: string) {
    if (!name || !matchId) return;
    try {
      window.localStorage.setItem(`cce_striker_override_${matchId}`, name);
      setStrikerOverride(name);
      setCopied(`Striker set: ${name}`);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      alert("Could not save striker override in browser localStorage.");
    }
  }

  function clearManualStriker() {
    if (!matchId) return;
    try {
      window.localStorage.removeItem(`cce_striker_override_${matchId}`);
      setStrikerOverride("");
      setCopied("Striker override cleared");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      alert("Could not clear striker override.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-[1520px]">
        <header className="mb-5 rounded-[1.8rem] bg-slate-950 px-7 py-6 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">CCE Broadcast Studio</p>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black leading-tight">STUMPS Overlay Control</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-white/60">
                Fetch STUMPS matches, generate OBS/Prism URLs, preview graphics, and control striker override.
              </p>
            </div>
            <button
              onClick={loadMatches}
              className="h-12 rounded-2xl bg-emerald-400 px-6 text-sm font-black text-slate-950 shadow-lg"
            >
              {loading ? "Refreshing..." : "Refresh Feed"}
            </button>
          </div>
        </header>

        {loadError ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-2xl font-black">STUMPS Match Feed</h2>
                <p className="text-sm font-semibold text-slate-500">Live, upcoming and recent completed matches.</p>
              </div>
              <label className="grid min-w-[320px] gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Manual Match ID fallback</span>
                <input
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value.trim())}
                  placeholder="Example: wlmq9078"
                  className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-black outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-2">
              {matches.length ? (
                matches.map((match) => {
                  const selected = matchId === match.matchId;
                  const teamA = match.teams?.[0];
                  const teamB = match.teams?.[1];
                  const cardOverlay = `${getBaseUrl()}/en/overlay/${match.matchId}?scene=${scene}&position=${position}&scale=${scale || "1"}`;
                  const cardLive = `${getBaseUrl()}/en/live/${match.matchId}`;
                  const status = shortStatus(match.matchStatus);

                  return (
                    <article
                      key={match.matchId}
                      className={`rounded-3xl border p-4 transition ${
                        selected ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <button onClick={() => setMatchId(match.matchId)} className="min-w-0 flex-1 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${status === "LIVE" ? "text-red-600" : "text-emerald-700"}`}>
                                {status}
                              </p>
                              <h3 className="mt-1 truncate text-xl font-black">{matchTitle(match)}</h3>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                ID: {match.matchId} • {match.matchFormat || "Format"} • {match.matchDate || ""} {match.matchTime || ""}
                              </p>
                            </div>
                            <span className={`rounded-full px-4 py-2 text-xs font-black ${selected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>
                              {selected ? "Selected" : "Select"}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                              <TeamLogo team={teamA} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">{teamA?.teamName || "Team A"}</p>
                                <p className="text-sm font-black text-emerald-600">{teamA?.teamScore || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                              <TeamLogo team={teamB} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">{teamB?.teamName || "Team B"}</p>
                                <p className="text-sm font-black text-emerald-600">{teamB?.teamScore || "-"}</p>
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:w-[390px] lg:grid-cols-1">
                          <button onClick={() => openPreview(cardOverlay)} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">
                            Open Overlay
                          </button>
                          <button onClick={() => copyUrl("OBS URL", cardOverlay)} className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950">
                            Copy OBS URL
                          </button>
                          <button onClick={() => openPreview(cardLive)} className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-800 ring-1 ring-slate-200">
                            Live Scorecard
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-lg font-black">No STUMPS matches loaded</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Click Refresh or enter a Match ID manually.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-2xl font-black">OBS Link Builder</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">Selected: {matchTitle(selectedMatch)}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                <SelectField label="Scene" value={scene} onChange={setScene} options={scenes} />
                <SelectField label="Position" value={position} onChange={setPosition} options={positions} />
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Scale</span>
                  <input value={scale} onChange={(e) => setScale(e.target.value)} className="h-11 rounded-2xl border border-slate-200 px-3 text-sm font-black outline-none focus:border-emerald-400" />
                </label>
                <SelectField label="Event" value={event} onChange={setEvent} options={events} />
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="checkbox" checked={summaryEnabled} onChange={(e) => setSummaryEnabled(e.target.checked)} className="h-5 w-5" />
                <span className="text-sm font-black">Show end-over summary</span>
              </label>

              <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">Final OBS / Prism URL</p>
                <p className="mt-3 max-h-24 overflow-y-auto break-all rounded-xl bg-white/10 p-3 text-xs font-bold text-white/85">
                  {overlayUrl || "Select match first"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => copyUrl("Main URL")} className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">
                    Copy URL
                  </button>
                  <button onClick={() => openPreview()} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
                    Open
                  </button>
                  <button onClick={() => openPreview(liveScoreUrl)} className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white ring-1 ring-white/10">
                    Live Scorecard
                  </button>
                  <button onClick={() => openPreview(apiDebugUrl)} className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white ring-1 ring-white/10">
                    API Debug
                  </button>
                </div>
                {copied ? <p className="mt-3 text-sm font-black text-emerald-300">Copied: {copied}</p> : null}
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black leading-tight">Manual Striker Toggle</h3>
                  <p className="mt-1 text-sm font-bold text-slate-600">Use only if auto striker is wrong.</p>
                </div>
                <button onClick={clearManualStriker} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-800 ring-1 ring-amber-200">
                  Clear
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {activeBatters.length ? (
                  activeBatters.map((batter: any) => {
                    const name = batter?.playerName || "Batter";
                    const active = strikerOverride === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setManualStriker(name)}
                        className={`rounded-2xl px-4 py-4 text-left ring-1 transition ${
                          active ? "bg-amber-500 text-slate-950 ring-amber-600" : "bg-white text-slate-900 ring-amber-200"
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                          {active ? "Manual striker active" : "Set as striker"}
                        </p>
                        <p className="mt-1 text-xl font-black">{name}</p>
                        <p className="text-sm font-bold opacity-70">
                          {batter?.runs ?? "-"}({batter?.balls ?? "-"})
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-amber-200">
                    Active batters not loaded yet.
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm font-bold text-slate-600">
                {strikerOverride ? `Current manual striker: ${strikerOverride}` : "No manual striker selected. Overlay uses automatic logic."}
              </p>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-black">Animation Preview</h3>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => openPreview(eventUrl("four"))} className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800 ring-1 ring-cyan-200">
                  FOUR
                </button>
                <button onClick={() => openPreview(eventUrl("six"))} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-200">
                  SIX
                </button>
                <button onClick={() => openPreview(eventUrl("wicket"))} className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-800 ring-1 ring-red-200">
                  WICKET
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
