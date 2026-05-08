"use client";

import { use, useEffect, useState } from "react";

type BattingPlayer = {
  playerName: string;
  dismissalStatus?: string | null;
  runs?: number | null;
  balls?: number | null;
  fours?: number | null;
  sixes?: number | null;
  strikeRate?: string | null;
};

type BowlingPlayer = {
  playerName: string;
  overs?: string | null;
  maidens?: number | null;
  runsConceded?: number | null;
  wickets?: number | null;
  economy?: string | null;
};

type Innings = {
  inningsNo: number;
  battingTeamName: string;
  bowlingTeamName: string;
  teamScore: number;
  wickets: number;
  overs: string;
  battingPlayers?: BattingPlayer[];
  bowlingPlayers?: BowlingPlayer[];
  inningsExtras?: {
    wides?: number | null;
    noBalls?: number | null;
    byes?: number | null;
    legByes?: number | null;
    penalty?: number | null;
    total?: number | null;
  };
};

type ScorecardData = {
  matchId: string;
  matchStatus: string;
  matchResult?: string;
  innnings?: Innings[]; // STUMPS API spelling
};

export default function LiveScorecardPage({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const { matchId } = use(params);

  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadScorecard() {
    try {
      const res = await fetch(`/api/stumps/scorecard/${matchId}`, {
        cache: "no-store",
      });

      const json = await res.json();

      setData(json.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Scorecard load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScorecard();
    const interval = setInterval(loadScorecard, 3000);
    return () => clearInterval(interval);
  }, [matchId]);

  const inningsList = data?.innnings || [];

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-2xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
                Live Scorecard
              </p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                STUMPS Match
              </h1>
              <p className="mt-2 text-sm text-slate-300 md:text-base">
                Match ID: {matchId}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Status
              </p>
              <p className="mt-1 text-xl font-black">
                {loading ? "Loading..." : data?.matchStatus || "Unknown"}
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Auto refresh: 3 sec {lastUpdated ? `• ${lastUpdated}` : ""}
              </p>
            </div>
          </div>

          {data?.matchResult && (
            <div className="mt-6 rounded-2xl bg-white/10 p-4 text-lg font-bold">
              {data.matchResult}
            </div>
          )}
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center font-bold shadow">
            Loading scorecard...
          </div>
        ) : inningsList.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow">
            <p className="text-xl font-black">No innings data available.</p>
            <p className="mt-2 text-slate-500">
              This match may not have detailed scorecard data from STUMPS yet.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {inningsList.map((innings) => (
              <section
                key={innings.inningsNo}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl"
              >
                <div className="bg-slate-950 p-5 text-white md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
                        Innings {innings.inningsNo}
                      </p>
                      <h2 className="mt-2 text-2xl font-black md:text-4xl">
                        {innings.battingTeamName}
                      </h2>
                      <p className="mt-1 text-slate-300">
                        vs {innings.bowlingTeamName}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-5xl font-black text-emerald-400">
                        {innings.teamScore}/{innings.wickets}
                      </p>
                      <p className="mt-1 text-lg text-slate-300">
                        Overs: {innings.overs}
                      </p>
                    </div>
                  </div>

                  {innings.inningsExtras && (
                    <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
                      Extras: {innings.inningsExtras.total ?? 0}{" "}
                      <span className="text-slate-400">
                        (Wd {innings.inningsExtras.wides ?? 0}, Nb{" "}
                        {innings.inningsExtras.noBalls ?? 0}, B{" "}
                        {innings.inningsExtras.byes ?? 0}, Lb{" "}
                        {innings.inningsExtras.legByes ?? 0})
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid gap-8 p-4 md:p-6 xl:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-2xl font-black">Batting</h3>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm md:text-base">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left">Player</th>
                            <th className="px-4 py-3 text-center">R</th>
                            <th className="px-4 py-3 text-center">B</th>
                            <th className="px-4 py-3 text-center">4s</th>
                            <th className="px-4 py-3 text-center">6s</th>
                            <th className="px-4 py-3 text-center">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(innings.battingPlayers || []).map((p, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-4 py-3">
                                <p className="font-black">{p.playerName}</p>
                                <p className="text-xs text-slate-500">
                                  {p.dismissalStatus || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center font-black">
                                {p.runs ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.balls ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.fours ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.sixes ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.strikeRate || "0.00"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-2xl font-black">Bowling</h3>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm md:text-base">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left">Bowler</th>
                            <th className="px-4 py-3 text-center">O</th>
                            <th className="px-4 py-3 text-center">M</th>
                            <th className="px-4 py-3 text-center">R</th>
                            <th className="px-4 py-3 text-center">W</th>
                            <th className="px-4 py-3 text-center">Eco</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(innings.bowlingPlayers || []).map((p, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-4 py-3 font-black">
                                {p.playerName}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.overs || "0"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.maidens ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.runsConceded ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center font-black text-emerald-700">
                                {p.wickets ?? 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.economy || "0.00"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}