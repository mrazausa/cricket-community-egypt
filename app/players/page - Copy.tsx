import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";
import { supabase } from "@/utils/supabase/client";

type PlayerRow = {
  id: string;
  name: string;
  slug: string;
  badge: string | null;
  role: string | null;
  base: string | null;
  overview: string | null;
  team_id: string | null;
  teams: {
    name: string | null;
  } | null;
};

export default async function PlayersPage() {
  const { data: players, error } = await supabase
    .from("players")
    .select(
      `
      id,
      name,
      slug,
      badge,
      role,
      base,
      overview,
      team_id,
      teams (
        name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h1 className="text-2xl font-bold">Error loading players</h1>
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
            Players Directory
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Discover player profiles, rankings, records, and standout
            contributors across cricket in Egypt.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            A premium player hub designed for mobile-first discovery, future
            profiles, stats, and tournament recognition.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Player Profiles
            </p>
            <h2 className="mt-3 text-2xl font-bold">Talent Directory</h2>
            <p className="mt-2 text-sm text-slate-600">
              A growing platform for player identity, career records, rankings,
              and cricket visibility.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Future Upgrade
            </p>
            <h2 className="mt-3 text-2xl font-bold">Stat Profiles</h2>
            <p className="mt-2 text-sm text-slate-600">
              Each player can later get full batting, bowling, awards, and
              tournament history breakdowns.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Registration Ready
            </p>
            <h2 className="mt-3 text-2xl font-bold">Player Entry</h2>
            <p className="mt-2 text-sm text-slate-600">
              New players will later be able to register, create profiles, and
              join the platform directly.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Players"
          title="Featured Player Profiles"
          subtitle="A premium cricket platform needs visible player identity, category recognition, and future-ready performance tracking."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(players as PlayerRow[] | null)?.map((player) => (
            <article
              key={player.id}
              className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {player.badge || "Player"}
                </span>

                <span className="text-xs font-medium text-slate-500">
                  {player.teams?.name || "No Team"}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold">{player.name}</h2>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Role:</span>{" "}
                  {player.role || "TBA"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Base:</span>{" "}
                  {player.base || "Egypt"}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {player.overview || "Player overview will be updated soon."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/players/${player.slug}`}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  View Profile
                </a>

                <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Stats
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
            title="Individual player pages will later include full stats, photos, and tournament history"
            subtitle="This player hub is designed to expand into detailed profiles with role, batting style, bowling style, team history, awards, rankings, and performance movement."
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}