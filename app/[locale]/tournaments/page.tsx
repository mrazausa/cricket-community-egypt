"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id?: string;
  title?: string | null;
  name?: string | null;
  slug?: string | null;
  status?: string | null;
  format?: string | null;
  venue?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  timeline?: string | null;
  description?: string | null;
  organizer?: string | null;
  logo_url?: string | null;
  hero_banner_url?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
};

const fallbackTournaments: TournamentRow[] = [
  {
    title: "Azhar Cricket Trophy - 2026",
    slug: "azhar-cricket-trophy-2026",
    status: "Live",
    format: "T20 - 15 Overs",
    venue: "Al Azhar Ground, Cairo - Egypt",
    timeline: "May 2026",
    organizer: "Cricket Community Egypt (CCE)",
    description:
      "Current flagship tournament featuring community teams, live updates, schedule, standings, and tournament coverage.",
    is_featured: true,
    sort_order: 1,
  },
  {
    title: "ICAE Cricket Carnival Edition 8",
    slug: "icae-cricket-carnival",
    status: "Completed",
    format: "Community Tournament",
    venue: "Bohra Community Ground, Sheikh Zayed",
    timeline: "Dec 2025 - Jan 2026",
    description:
      "A flagship cricket carnival bringing together top teams, legends, students, and the wider community in Egypt.",
    sort_order: 2,
  },
  {
    title: "Egyptian Premier Cricket League",
    slug: "epcl",
    status: "Completed",
    format: "League Tournament",
    venue: "Cairo & Ismailia",
    timeline: "Season Archive",
    description:
      "A major competitive league featuring top club-level cricket teams and standout talent from across Egypt.",
    sort_order: 3,
  },
  {
    title: "Faisal-Damoder Memorial Trophy",
    slug: "faisal-memorial",
    status: "Featured",
    format: "Memorial Tournament",
    venue: "Egypt",
    timeline: "Annual Event",
    description:
      "A legacy tournament honoring contribution, sportsmanship, and unforgettable community cricket memories.",
    sort_order: 4,
  },
];

function getTournamentTitle(tournament: TournamentRow) {
  return tournament.title || tournament.name || "Untitled Tournament";
}

function getTournamentTimeline(tournament: TournamentRow) {
  if (tournament.timeline) return tournament.timeline;

  if (tournament.start_date && tournament.end_date) {
    return `${formatDate(tournament.start_date)} - ${formatDate(tournament.end_date)}`;
  }

  if (tournament.start_date) return formatDate(tournament.start_date);

  return "To be announced";
}

function formatDate(value?: string | null) {
  if (!value) return "To be announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyles(status?: string | null) {
  const clean = (status || "").toLowerCase();

  if (clean.includes("live") || clean.includes("ongoing")) {
    return "bg-red-100 text-red-700";
  }

  if (clean.includes("upcoming")) {
    return "bg-amber-100 text-amber-800";
  }

  if (clean.includes("completed") || clean.includes("archive")) {
    return "bg-slate-200 text-slate-700";
  }

  if (clean.includes("featured")) {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function normalizeStatus(status?: string | null) {
  return status || "Featured";
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>(fallbackTournaments);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      setTournaments(data as TournamentRow[]);
    }

    setLoading(false);
  }

  const filteredTournaments = useMemo(() => {
    if (activeFilter === "All") return tournaments;

    return tournaments.filter((item) =>
      normalizeStatus(item.status).toLowerCase().includes(activeFilter.toLowerCase())
    );
  }, [activeFilter, tournaments]);

  const featuredTournament =
    tournaments.find((item) => item.is_featured) ||
    tournaments.find((item) => normalizeStatus(item.status).toLowerCase().includes("live")) ||
    tournaments[0];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Tournament Hub
          </p>

          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
                Explore ongoing, upcoming, featured, and historic cricket tournaments in Egypt.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                A premium tournament center built for fans, teams, organizers, and the full cricket community across Egypt.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={featuredTournament?.slug ? `/tournaments/${featuredTournament.slug}` : "/tournaments"}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Open Featured Tournament
                </a>
                <a
                  href="#directory"
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Browse All
                </a>
              </div>
            </div>

            {featuredTournament ? (
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Featured
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  {getTournamentTitle(featuredTournament)}
                </h2>
                <p className="mt-3 text-sm text-slate-200">
                  {featuredTournament.venue || "Venue to be announced"}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {getTournamentTimeline(featuredTournament)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          {["All", "Live", "Upcoming", "Completed", "Featured"].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section id="directory" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Tournaments"
          title="Tournament Directory"
          subtitle="Browse current competitions, archived editions, memorial trophies, and upcoming cricket events."
        />

        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-slate-600 shadow-md ring-1 ring-slate-200">
            Loading tournaments...
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-slate-600 shadow-md ring-1 ring-slate-200">
            No tournaments found for this filter.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTournaments.map((tournament) => {
              const title = getTournamentTitle(tournament);
              const status = normalizeStatus(tournament.status);
              const imageUrl = tournament.hero_banner_url || tournament.logo_url || "";

              return (
                <article
                  key={tournament.id || tournament.slug || title}
                  className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {imageUrl ? (
                    <div className="h-40 bg-slate-100">
                      <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
                    </div>
                  ) : null}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(status)}`}>
                        {status}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {tournament.format || "Cricket Tournament"}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold leading-snug">{title}</h2>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">Venue:</span>{" "}
                        {tournament.venue || "To be announced"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Timeline:</span>{" "}
                        {getTournamentTimeline(tournament)}
                      </p>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {tournament.description || "Tournament information will be updated soon."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <a
                        href={tournament.slug ? `/tournaments/${tournament.slug}` : "/tournaments"}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        View Tournament
                      </a>
                      <a
                        href={tournament.slug ? `/tournaments/${tournament.slug}#schedule` : "/tournaments"}
                        className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Schedule
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
