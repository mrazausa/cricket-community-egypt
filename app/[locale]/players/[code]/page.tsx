import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type PlayerDirectoryRow = {
  id: string;
  player_name: string;
  normalized_name: string | null;
  team_name: string | null;
  year_label: string | null;
  matches: number | null;
  innings: number | null;
  runs: number | null;
  wickets: number | null;
  batting_average: number | null;
  strike_rate: number | null;
  economy: number | null;
  mvp_points: number | null;
  batting_score: number | null;
  bowling_score: number | null;
  all_round_score: number | null;
  fielding_score: number | null;
  hybrid_score: number | null;
  image_url: string | null;
  bio: string | null;
};

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function slugify(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rowCode(row: PlayerDirectoryRow) {
  return slugify(row.normalized_name || row.player_name);
}

function parseBio(row: PlayerDirectoryRow) {
  if (!row.bio) return {} as Record<string, any>;
  try {
    return JSON.parse(row.bio) as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatNumber(value: number | null | undefined, digits = 0) {
  const num = toNumber(value);
  if (digits === 0) return Math.round(num).toString();
  return num.toFixed(digits).replace(/\.0+$/, "");
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const requestedCode = decodeURIComponent(code || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("player_directory_csv")
    .select("*")
    .eq("show_on_public", true)
    .eq("is_active", true)
    .order("year_label", { ascending: false })
    .order("team_name", { ascending: true });

  const allRows = ((data || []) as PlayerDirectoryRow[]).filter((row) => row.player_name);
  const rows = allRows.filter((row) => rowCode(row) === requestedCode);
  const first = rows[0];

  const totals = rows.reduce(
    (acc, row) => ({
      matches: acc.matches + toNumber(row.matches),
      innings: acc.innings + toNumber(row.innings),
      runs: acc.runs + toNumber(row.runs),
      wickets: acc.wickets + toNumber(row.wickets),
      mvpPoints: acc.mvpPoints + toNumber(row.mvp_points),
      battingScore: acc.battingScore + toNumber(row.batting_score),
      bowlingScore: acc.bowlingScore + toNumber(row.bowling_score),
      allRoundScore: acc.allRoundScore + toNumber(row.all_round_score),
      fieldingScore: acc.fieldingScore + toNumber(row.fielding_score),
      hybridScore: acc.hybridScore + toNumber(row.hybrid_score),
    }),
    { matches: 0, innings: 0, runs: 0, wickets: 0, mvpPoints: 0, battingScore: 0, bowlingScore: 0, allRoundScore: 0, fieldingScore: 0, hybridScore: 0 }
  );

  const teams = unique(rows.map((row) => row.team_name || ""));
  const years = unique(rows.map((row) => row.year_label || "")).sort();
  const image = first?.image_url || null;
  const playerName = first?.player_name || "Player";
  const bestBatting = rows.length ? Math.max(...rows.map((row) => toNumber(row.batting_score))) : 0;
  const bestBowling = rows.length ? Math.max(...rows.map((row) => toNumber(row.bowling_score))) : 0;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <a href="/players" className="mb-5 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-white/15">
            ← Players Directory
          </a>

          {error || rows.length === 0 ? (
            <div>
              <h1 className="text-3xl font-bold sm:text-5xl">Player not found</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                This CSV-based player profile is not available yet. The profile code may not match the imported CSV player name.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {image ? (
                  <img src={image} alt={playerName} className="h-24 w-24 rounded-3xl object-cover ring-2 ring-white/20" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-3xl font-black text-white ring-1 ring-white/15">
                    {initials(playerName)}
                  </div>
                )}
                <div>
                  <p className="mb-3 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
                    Player Correspondence Page
                  </p>
                  <h1 className="text-3xl font-black leading-tight sm:text-5xl">{playerName}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
                    Teams: {teams.join(", ") || "-"} • Years: {years.join(", ") || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {rows.length > 0 ? (
        <>
          <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard label="Matches" value={totals.matches} />
              <StatCard label="Runs" value={totals.runs} />
              <StatCard label="Wickets" value={totals.wickets} />
              <StatCard label="MVP Points" value={formatNumber(totals.mvpPoints, 1)} />
              <StatCard label="Hybrid" value={formatNumber(totals.hybridScore, 1)} />
              <StatCard label="Teams" value={teams.length} />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
            <div className="grid gap-4 lg:grid-cols-2">
              <InfoCard title="Team History" value={teams.join(", ") || "-"} helper="Player may appear under multiple teams when the CSV has year-wise team movement." />
              <InfoCard title="Performance Profile" value={`Best Batting Score ${formatNumber(bestBatting, 1)} • Best Bowling Score ${formatNumber(bestBowling, 1)}`} helper="Scores are imported from the consolidated CCE yearly performance CSV." />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200">
              <div className="border-b border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Year-wise History</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Performance by team and year</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3">M</th>
                      <th className="px-4 py-3">Inn</th>
                      <th className="px-4 py-3">Runs</th>
                      <th className="px-4 py-3">Avg</th>
                      <th className="px-4 py-3">SR</th>
                      <th className="px-4 py-3">Wkts</th>
                      <th className="px-4 py-3">Eco</th>
                      <th className="px-4 py-3">MVP</th>
                      <th className="px-4 py-3">Bat Score</th>
                      <th className="px-4 py-3">Bowl Score</th>
                      <th className="px-4 py-3">Tournament</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row) => {
                      const bio = parseBio(row);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4 font-bold text-slate-950">{row.year_label || "-"}</td>
                          <td className="px-4 py-4 font-semibold">{row.team_name || "-"}</td>
                          <td className="px-4 py-4">{row.matches ?? 0}</td>
                          <td className="px-4 py-4">{row.innings ?? 0}</td>
                          <td className="px-4 py-4">{row.runs ?? 0}</td>
                          <td className="px-4 py-4">{formatNumber(row.batting_average, 2)}</td>
                          <td className="px-4 py-4">{formatNumber(row.strike_rate, 1)}</td>
                          <td className="px-4 py-4">{row.wickets ?? 0}</td>
                          <td className="px-4 py-4">{formatNumber(row.economy, 2)}</td>
                          <td className="px-4 py-4 font-bold text-emerald-700">{formatNumber(row.mvp_points, 1)}</td>
                          <td className="px-4 py-4">{formatNumber(row.batting_score, 1)}</td>
                          <td className="px-4 py-4">{formatNumber(row.bowling_score, 1)}</td>
                          <td className="px-4 py-4 text-slate-600">{bio.Tournaments || bio.tournaments || bio.tournament || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <SiteFooter />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}
