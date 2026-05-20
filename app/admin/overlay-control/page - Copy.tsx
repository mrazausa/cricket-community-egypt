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
  teams?: Team[];
};

type LiveSummary = {
  liveMatches?: Match[];
  upcomingMatches?: Match[];
  completedMatches?: Match[];
};

const scenes = [
  { value: "auto", label: "Auto Scene" },
  { value: "live", label: "Lower Third" },
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
  { value: "four", label: "FOUR Animation" },
  { value: "six", label: "SIX Animation" },
  { value: "wicket", label: "WICKET Animation" },
];

function getBaseUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function matchTitle(match?: Match | null) {
  if (!match) return "Select match";
  const a = match.teams?.[0]?.teamName || "Team A";
  const b = match.teams?.[1]?.teamName || "Team B";
  return match.matchTitle && match.matchTitle !== "Match" ? `${match.matchTitle} • ${a} vs ${b}` : `${a} vs ${b}`;
}

function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-400"
      />
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

  const [striker, setStriker] = useState("");
  const [sr, setSr] = useState("");
  const [sb, setSb] = useState("");
  const [non, setNon] = useState("");
  const [nr, setNr] = useState("");
  const [nb, setNb] = useState("");
  const [bowler, setBowler] = useState("");
  const [bo, setBo] = useState("");
  const [br, setBr] = useState("");
  const [bw, setBw] = useState("");
  const [balls, setBalls] = useState("");
  const [proj, setProj] = useState("");
  const [target, setTarget] = useState("");
  const [need, setNeed] = useState("");
  const [rrr, setRrr] = useState("");

  async function loadMatches() {
    try {
      setLoadError("");
      const res = await fetch(`${window.location.origin}/api/stumps/live-summary`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSummary(json);
    } catch (err) {
      console.error("Overlay control live-summary fetch failed:", err);
      setLoadError("Could not load STUMPS match list. You can still enter Match ID manually and generate overlay URL.");
      setSummary({ liveMatches: [], upcomingMatches: [], completedMatches: [] });
    }
  }

  useEffect(() => {
    loadMatches();
    const timer = window.setInterval(loadMatches, 10000);
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

    if (striker) params.set("striker", striker);
    if (sr) params.set("sr", sr);
    if (sb) params.set("sb", sb);
    if (non) params.set("non", non);
    if (nr) params.set("nr", nr);
    if (nb) params.set("nb", nb);
    if (bowler) params.set("bowler", bowler);
    if (bo) params.set("bo", bo);
    if (br) params.set("br", br);
    if (bw) params.set("bw", bw);
    if (balls) params.set("balls", balls);
    if (proj) params.set("proj", proj);
    if (target) params.set("target", target);
    if (need) params.set("need", need);
    if (rrr) params.set("rrr", rrr);

    return `${getBaseUrl()}/en/overlay/${matchId}?${params.toString()}`;
  }, [matchId, scene, position, scale, event, summaryEnabled, striker, sr, sb, non, nr, nb, bowler, bo, br, bw, balls, proj, target, need, rrr]);

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

  function clearManual() {
    setStriker(""); setSr(""); setSb(""); setNon(""); setNr(""); setNb("");
    setBowler(""); setBo(""); setBr(""); setBw(""); setBalls("");
    setProj(""); setTarget(""); setNeed(""); setRrr("");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">CCE Broadcast Studio</p>
          <h1 className="mt-2 text-4xl font-black">Overlay Control Panel</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-white/60">
            STUMPS gives live score automatically. Use manual feed below for batsmen, bowler, this-over balls, projected score, and chase data.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Match Source</h2>
                <p className="text-sm font-semibold text-slate-500">Auto-fetched from STUMPS live summary.</p>
              </div>
              <button onClick={loadMatches} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Refresh</button>
            </div>

            {loadError ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{loadError}</div> : null}

            <label className="mb-4 grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Manual Match ID</span>
              <input
                value={matchId}
                onChange={(e) => setMatchId(e.target.value.trim())}
                placeholder="Example: wlmq9078"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-400"
              />
            </label>

            <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1">
              {matches.map((match) => (
                <button
                  key={match.matchId}
                  onClick={() => setMatchId(match.matchId)}
                  className={`rounded-3xl border p-4 text-left transition ${matchId === match.matchId ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">{match.matchStatus || "Match"}</p>
                      <h3 className="mt-1 text-xl font-black">{matchTitle(match)}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">ID: {match.matchId} • {match.matchDate || ""} {match.matchTime || ""}</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">Select</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-black">Overlay Builder</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Selected: {matchTitle(selectedMatch)}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Scene</span><select value={scene} onChange={(e) => setScene(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">{scenes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Position</span><select value={position} onChange={(e) => setPosition(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">{positions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Scale</span><input value={scale} onChange={(e) => setScale(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder="0.9 / 1 / 1.1" /></label>
              <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Event Animation</span><select value={event} onChange={(e) => setEvent(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">{events.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            </div>

            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">Manual Detailed Feed</h3>
                  <p className="text-sm font-bold text-slate-600">Use this when STUMPS gives score only.</p>
                </div>
                <button onClick={clearManual} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200">Clear</button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Striker" value={striker} setValue={setStriker} placeholder="Farhan Siddik" />
                <Field label="Runs" value={sr} setValue={setSr} placeholder="27" />
                <Field label="Balls" value={sb} setValue={setSb} placeholder="12" />
                <Field label="Non-striker" value={non} setValue={setNon} placeholder="Moin Khan" />
                <Field label="Runs" value={nr} setValue={setNr} placeholder="8" />
                <Field label="Balls" value={nb} setValue={setNb} placeholder="5" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Field label="Bowler" value={bowler} setValue={setBowler} placeholder="Humayun Kabir" />
                <Field label="B. Overs" value={bo} setValue={setBo} placeholder="1.2" />
                <Field label="B. Runs" value={br} setValue={setBr} placeholder="19" />
                <Field label="B. Wkts" value={bw} setValue={setBw} placeholder="0" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Field label="This Over" value={balls} setValue={setBalls} placeholder=". . 4 W 1 6" />
                <Field label="Projected" value={proj} setValue={setProj} placeholder="155" />
                <Field label="Target" value={target} setValue={setTarget} placeholder="93" />
                <Field label="Need / RRR" value={need} setValue={setNeed} placeholder="45/30b" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Required Rate" value={rrr} setValue={setRrr} placeholder="9.00" />
                <label className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
                  <input type="checkbox" checked={summaryEnabled} onChange={(e) => setSummaryEnabled(e.target.checked)} className="h-5 w-5" />
                  <span className="text-sm font-black">Show automatic end-of-over summary</span>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Prism / OBS URL</p>
              <p className="mt-3 break-all rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/85">{overlayUrl || "Select match first"}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={() => copyUrl("Main URL")} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Copy URL</button>
                <button onClick={() => openPreview()} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Open Preview</button>
              </div>
              {copied ? <p className="mt-3 text-sm font-black text-emerald-300">Copied: {copied}</p> : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button onClick={() => openPreview(eventUrl("four"))} className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800">Preview FOUR</button>
              <button onClick={() => openPreview(eventUrl("six"))} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">Preview SIX</button>
              <button onClick={() => openPreview(eventUrl("wicket"))} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">Preview WICKET</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
