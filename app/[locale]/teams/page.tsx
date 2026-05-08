import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  badge: string | null;
  captain: string | null;
  base: string | null;
  titles: string | null;
  overview: string | null;
  logo_url?: string | null;
};

type TeamRankingRow = {
  id: string;
  team_id: string | null;
  rank_position: number | null;
  points: number | null;
  matches: number | null;
  wins: number | null;
  form: string | null;
  rating: number | null;
  season_label: string | null;
  updated_at: string | null;
};

type TeamCardRow = TeamRow & {
  ranking?: TeamRankingRow | null;
};

function splitForm(form: string | null) {
  if (!form) return [];
  return form.replace(/\s+/g, "").split("");
}

export default async function TeamsPage() {
  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, slug, badge, captain, base, titles, overview, logo_url")
    .order("name", { ascending: true });

  const { data: rankingsData } = await supabase
    .from("team_rankings")
    .select(
      "id, team_id, rank_position, points, matches, wins, form, rating, season_label, updated_at"
    )
    .order("rank_position", { ascending: true });

  const teams = (teamsData as TeamRow[] | null) || [];
  const rankings = (rankingsData as TeamRankingRow[] | null) || [];

  const rankingMap = new Map<string, TeamRankingRow>();
  for (const row of rankings) {
    if (!row.team_id) continue;
    const existing = rankingMap.get(row.team_id);
    if (!existing) {
      rankingMap.set(row.team_id, row);
      continue;
    }

    const existingRank = existing.rank_position ?? 999999;
    const currentRank = row.rank_position ?? 999999;
    if (currentRank < existingRank) {
      rankingMap.set(row.team_id, row);
    }
  }

  const teamCards: TeamCardRow[] = teams.map((team) => ({
    ...team,
    ranking: rankingMap.get(team.id) || null,
  }));

  teamCards.sort((a, b) => {
    const aRank = a.ranking?.rank_position ?? 999999;
    const bRank = b.ranking?.rank_position ?? 999999;

    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Teams
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Explore Cricket Teams Across Egypt
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Discover official teams, current rankings, squad leadership, and competitive standing on Cricket Community Egypt.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Official Teams
            </p>
            <h2 className="mt-1 text-3xl font-bold">Team Directory</h2>
          </div>

          <a
            href="/rankings"
            className="hidden rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-block"
          >
            View Rankings
          </a>
        </div>

        {teamsError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load teams.
          </div>
        ) : teamCards.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
            No teams found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {teamCards.map((team) => {
              const formList = splitForm(team.ranking?.form ?? null);

              return (
                <a
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  className="group rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-14 w-14 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                          {team.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700">
                          {team.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {team.base || "Egypt"}
                        </p>
                      </div>
                    </div>

                    {team.ranking?.rank_position ? (
                      <div className="rounded-2xl bg-slate-900 px-3 py-2 text-center text-white">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-300">
                          Rank
                        </p>
                        <p className="text-lg font-bold">
                          #{team.ranking.rank_position}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-slate-600">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                          Rank
                        </p>
                        <p className="text-lg font-bold">-</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <InfoBox label="Captain" value={team.captain || "TBA"} />
                    <InfoBox label="Titles" value={team.titles || "Updating"} />
                    <InfoBox
                      label="Points"
                      value={team.ranking?.points ?? "-"}
                    />
                    <InfoBox
                      label="Rating"
                      value={team.ranking?.rating ?? "-"}
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Overview
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {team.overview || "Team profile and highlights will be updated soon."}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        Recent Form
                      </p>
                      <div className="mt-2 flex gap-2">
                        {formList.length > 0 ? (
                          formList.slice(0, 5).map((item, index) => (
                            <div
                              key={`${team.id}-${index}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                            >
                              {item}
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">No form data</span>
                        )}
                      </div>
                    </div>

                    <span className="text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">
                      View Team →
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}