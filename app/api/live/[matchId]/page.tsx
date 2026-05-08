"use client";

import { useEffect, useState } from "react";

type BattingPlayer = {
  playerName: string;
  dismissalStatus: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
};

type BowlingPlayer = {
  playerName: string;
  overs: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: string;
};

type Innings = {
  inningsNo: number;
  battingTeamName: string;
  bowlingTeamName: string;
  teamScore: number;
  wickets: number;
  overs: string;
  battingPlayers: BattingPlayer[];
  bowlingPlayers: BowlingPlayer[];
};

type ScorecardResponse = {
  matchId: string;
  matchStatus: string;
  matchResult: string;
  innnings: Innings[];
};

export default function LiveScorecardPage({
  params,
}: {
  params: { matchId: string };
}) {
  const [data, setData] = useState<ScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadScorecard() {
    try {
      const res = await fetch(
        `/api/stumps/scorecard/${params.matchId}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      setData(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScorecard();

    const interval = setInterval(() => {
      loadScorecard();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-xl font-semibold">
        Loading live scorecard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-red-500">
        Failed to load scorecard
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 to-slate-800 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-emerald-400">
                Live Match Center
              </div>

              <h1 className="mt-2 text-3xl font-black">
                Match #{data.matchId}
              </h1>

              <p className="mt-2 text-slate-300">
                {data.matchStatus}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
              <div className="text-xs uppercase tracking-widest text-emerald-300">
                Result
              </div>

              <div className="mt-2 text-lg font-bold">
                {data.matchResult}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {data.innnings?.map((innings) => (
            <section
              key={innings.inningsNo}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="bg-slate-900 px-6 py-5 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                      Innings {innings.inningsNo}
                    </div>

                    <h2 className="mt-2 text-3xl font-black">
                      {innings.battingTeamName}
                    </h2>
                  </div>

                  <div className="text-right">
                    <div className="text-5xl font-black text-emerald-400">
                      {innings.teamScore}/{innings.wickets}
                    </div>

                    <div className="mt-2 text-lg text-slate-300">
                      Overs: {innings.overs}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 p-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-2xl font-black text-slate-900">
                    Batting
                  </h3>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
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
                        {innings.battingPlayers?.map((player, index) => (
                          <tr
                            key={index}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">
                                {player.playerName}
                              </div>

                              <div className="text-xs text-slate-500">
                                {player.dismissalStatus}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center font-bold">
                              {player.runs ?? 0}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.balls ?? 0}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.fours ?? 0}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.sixes ?? 0}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.strikeRate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-2xl font-black text-slate-900">
                    Bowling
                  </h3>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left">Bowler</th>
                          <th className="px-4 py-3 text-center">O</th>
                          <th className="px-4 py-3 text-center">R</th>
                          <th className="px-4 py-3 text-center">W</th>
                          <th className="px-4 py-3 text-center">ECO</th>
                        </tr>
                      </thead>

                      <tbody>
                        {innings.bowlingPlayers?.map((player, index) => (
                          <tr
                            key={index}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {player.playerName}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.overs}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.runsConceded}
                            </td>

                            <td className="px-4 py-3 text-center font-bold text-emerald-700">
                              {player.wickets ?? 0}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {player.economy}
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
      </div>
    </main>
  );
}