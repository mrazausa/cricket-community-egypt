import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";
import { supabase } from "@/utils/supabase/client";

function getStatusStyles(status: string) {
  switch (status) {
    case "live":
      return "bg-red-100 text-red-600";
    case "upcoming":
      return "bg-amber-100 text-amber-700";
    case "completed":
      return "bg-slate-200 text-slate-700";
    case "featured":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string) {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

type TournamentRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  format: string | null;
  venue: string | null;
  timeline: string | null;
  overview: string | null;
};

export default async function TournamentsPage() {
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, title, slug, status, format, venue, timeline, overview")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h1 className="text-2xl font-bold">Error loading tournaments</h1>
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
            Tournament Hub
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Explore ongoing, upcoming, featured, and historic cricket tournaments
            in Egypt.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            A premium tournament center built for mobile users, fans, teams,
            organizers, and the full cricket community across Egypt.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
              Ongoing Tournaments
            </button>
            <button className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
              Tournament Archives
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            All
          </button>
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Live
          </button>
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Upcoming
          </button>
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Completed
          </button>
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Featured
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Tournaments"
          title="Tournament Directory"
          subtitle="Browse the major competitions, archive editions, memorial trophies, and current flagship tournaments shaping cricket in Egypt."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(tournaments as TournamentRow[] | null)?.map((tournament) => (
            <article
              key={tournament.id}
              className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(
                    tournament.status
                  )}`}
                >
                  {formatStatus(tournament.status)}
                </span>

                <span className="text-xs font-medium text-slate-500">
                  {tournament.format || "Tournament"}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold leading-snug">
                {tournament.title}
              </h2>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Venue:</span>{" "}
                  {tournament.venue || "TBA"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Timeline:</span>{" "}
                  {tournament.timeline || "TBA"}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {tournament.overview || "Tournament overview will be updated soon."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/tournaments/${tournament.slug}`}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  View Tournament
                </a>

                <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Schedule
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <SectionTitle
            eyebrow="Need Participation?"
            title="Open the path for teams and players to join future tournaments"
            subtitle="Tournament registrations, squad onboarding, and player applications will be connected here in the next phase."
            actionLabel="Go to Registration"
            actionHref="/register/team"
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}