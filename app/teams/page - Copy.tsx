import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";
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
};

export default async function TeamsPage() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, slug, badge, captain, base, titles, overview")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h1 className="text-2xl font-bold">Error loading teams</h1>
            <p className="mt-3 text-sm">{error.message}</p>
          </div>
        </section>

        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Teams Directory
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Explore team identities, leadership, achievements, and tournament
            presence across Egypt.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            A premium team hub built for mobile-first browsing, future team
            profiles, rankings, and squad records.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Total Teams
            </p>
            <h2 className="mt-3 text-2xl font-bold">Growing Network</h2>
            <p className="mt-2 text-sm text-slate-600">
              A structured team ecosystem for tournaments, rankings, and cricket
              identity building.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Future Upgrade
            </p>
            <h2 className="mt-3 text-2xl font-bold">Squad Profiles</h2>
            <p className="mt-2 text-sm text-slate-600">
              Each team can later get full squad, stats, trophies, and
              tournament history pages.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Registration Ready
            </p>
            <h2 className="mt-3 text-2xl font-bold">Tournament Entry</h2>
            <p className="mt-2 text-sm text-slate-600">
              Teams will later be able to register directly for upcoming
              competitions from the platform.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Teams"
          title="Featured Team Profiles"
          subtitle="A strong cricket platform needs dedicated team identity, leadership, recognition, and archived presence."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(teams as TeamRow[] | null)?.map((team) => (
            <article
              key={team.id}
              className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {team.badge || "Team"}
                </span>

                <span className="text-xs font-medium text-slate-500">
                  {team.base || "Egypt"}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold">{team.name}</h2>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Captain:</span>{" "}
                  {team.captain || "TBA"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Record:</span>{" "}
                  {team.titles || "Updating soon"}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {team.overview || "Team overview will be updated soon."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/teams/${team.slug}`}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  View Team
                </a>

                <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Squad
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <SectionTitle
            eyebrow="Next Phase"
            title="Individual team pages will later include full squads and performance history"
            subtitle="This team hub is designed to expand into detailed team profiles with logos, player lists, tournament participation, title history, galleries, and ranking movement."
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}