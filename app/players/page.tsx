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
  hybrid_score: number | null;
  image_url: string | null;
  bio: string | null;
};

type PageBlockRow = {
  block_key: string;
  is_visible: boolean | null;
  sort_order: number | null;
};

type PlayerSummary = {
  slug: string;
  name: string;
  teamName: string;
  years: string[];
  matches: number;
  runs: number;
  wickets: number;
  mvpPoints: number;
  imageUrl: string | null;
};

function isBlockVisible(blocks: Map<string, boolean>, key: string) {
  return blocks.get(key) !== false;
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";
}

function makeSlug(row: PlayerDirectoryRow) {
  return row.normalized_name || row.player_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildTeamGroups(rows: PlayerDirectoryRow[]) {
  const teams = new Map<string, Map<string, PlayerSummary>>();

  for (const row of rows) {
    const teamName = row.team_name || "Unknown Team";
    const slug = makeSlug(row);
    const team = teams.get(teamName) || new Map<string, PlayerSummary>();
    const existing = team.get(slug);

    if (!existing) {
      team.set(slug, {
        slug,
        name: row.player_name,
        teamName,
        years: row.year_label ? [row.year_label] : [],
        matches: toNumber(row.matches),
        runs: toNumber(row.runs),
        wickets: toNumber(row.wickets),
        mvpPoints: toNumber(row.mvp_points),
        imageUrl: row.image_url,
      });
    } else {
      if (row.year_label && !existing.years.includes(row.year_label)) existing.years.push(row.year_label);
      existing.matches += toNumber(row.matches);
      existing.runs += toNumber(row.runs);
      existing.wickets += toNumber(row.wickets);
      existing.mvpPoints += toNumber(row.mvp_points);
      existing.imageUrl = existing.imageUrl || row.image_url;
    }

    teams.set(teamName, team);
  }

  return Array.from(teams.entries())
    .map(([teamName, players]) => ({
      teamName,
      players: Array.from(players.values()).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export default async function PlayersPage() {
  const [{ data: blockData }, { data, error }] = await Promise.all([
    supabase
      .from("site_page_blocks")
      .select("block_key, is_visible, sort_order")
      .eq("page_key", "players"),
    supabase
      .from("player_directory_csv")
      .select("*")
      .eq("show_on_public", true)
      .eq("is_active", true)
      .order("team_name", { ascending: true })
      .order("player_name", { ascending: true }),
  ]);

  const blocks = new Map(
    ((blockData || []) as PageBlockRow[]).map((block) => [block.block_key, block.is_visible !== false])
  );

  const rows = ((data || []) as PlayerDirectoryRow[]).filter((row) => row.player_name);
  const teamGroups = buildTeamGroups(rows);
  const totalPlayers = new Set(rows.map((row) => makeSlug(row))).size;
  const totalTeams = teamGroups.length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      {isBlockVisible(blocks, "hero") ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
            <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Players Directory
            </p>
            <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
              CCE players grouped by their teams and yearly performance.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
              Temporary CSV-powered directory until online player registration profiles are finalized. Players who represented multiple teams are shown with their year-wise history inside the profile.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroStat label="Players" value={totalPlayers} />
              <HeroStat label="Teams" value={totalTeams} />
              <HeroStat label="Rows" value={rows.length} />
            </div>
          </div>
        </section>
      ) : null}

      {isBlockVisible(blocks, "ranking_button") ? (
        <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Quick Navigation</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Explore performance rankings</h2>
            </div>
            <a href="/rankings" className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
              View Rankings →
            </a>
          </div>
        </section>
      ) : null}

      {isBlockVisible(blocks, "directory") ? (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Team-wise Directory</p>
              <h2 className="mt-1 text-3xl font-bold">Players by Team</h2>
              <p className="mt-2 text-sm text-slate-600">Click any player to open full yearly performance details.</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Failed to load player directory.</div>
          ) : teamGroups.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
              No CSV player directory data found. Import CCE_Player_Yearly_Performance.csv from Admin → Player Directory Import.
            </div>
          ) : (
            <div className="space-y-6">
              {teamGroups.map((group) => (
                <section key={group.teamName} className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Team</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">{group.teamName}</h3>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                      {group.players.length} players
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.players.map((player) => (
                      <a key={`${group.teamName}-${player.slug}`} href={`/players/${player.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
                        <div className="flex items-start gap-3">
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                              {initials(player.name)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-base font-black text-slate-950 group-hover:text-emerald-700">{player.name}</h4>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Years: {player.years.sort().join(", ") || "-"}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-700">→</span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                          <MiniStat label="M" value={player.matches} />
                          <MiniStat label="Runs" value={player.runs} />
                          <MiniStat label="Wkts" value={player.wickets} />
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}
