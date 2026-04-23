import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";

const mediaItems = [
  {
    title: "ICAE Cricket Carnival Highlights",
    type: "Photo Gallery",
    date: "Latest Coverage",
    summary:
      "A visual collection of match moments, celebrations, crowd energy, and tournament atmosphere.",
  },
  {
    title: "Egypt Cricket Community Stories",
    type: "Feature Story",
    date: "Editorial",
    summary:
      "Narratives and stories that capture the spirit, people, and growth of cricket across Egypt.",
  },
  {
    title: "Memorial Tournament Moments",
    type: "Special Coverage",
    date: "Archive Feature",
    summary:
      "A premium archive space for legacy tournaments, emotional moments, and tribute-driven events.",
  },
  {
    title: "Team Spotlight Media Pack",
    type: "Team Coverage",
    date: "Upcoming Module",
    summary:
      "Dedicated team-focused coverage with banners, match visuals, and identity-driven storytelling.",
  },
  {
    title: "Player Spotlight Reels",
    type: "Video Feature",
    date: "Coming Soon",
    summary:
      "Short-form content and highlight reels for player recognition and performance storytelling.",
  },
  {
    title: "Tournament Press & Announcements",
    type: "Newsroom",
    date: "Official Updates",
    summary:
      "A stream of notices, updates, announcements, and event communication for the cricket community.",
  },
];

export default function MediaPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Media Center
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Watch, read, and relive the stories, visuals, highlights, and moments of cricket in Egypt.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            A premium media hub for galleries, feature stories, tournament highlights, press updates, and visual community storytelling.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Visual Archive
            </p>
            <h2 className="mt-3 text-2xl font-bold">Gallery Driven</h2>
            <p className="mt-2 text-sm text-slate-600">
              A structured media system for match photos, tournament memories, and premium visual presentation.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Future Upgrade
            </p>
            <h2 className="mt-3 text-2xl font-bold">Videos & Reels</h2>
            <p className="mt-2 text-sm text-slate-600">
              The media hub can later expand into video highlights, reels, interviews, and announcement clips.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Editorial Layer
            </p>
            <h2 className="mt-3 text-2xl font-bold">Stories & Press</h2>
            <p className="mt-2 text-sm text-slate-600">
              A place for storytelling, official announcements, tournament notes, and community journalism.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Media"
          title="Featured Media Collections"
          subtitle="A premium cricket portal should preserve the visual, emotional, and editorial side of tournaments and community life."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {mediaItems.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {item.type}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {item.date}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold">{item.title}</h2>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {item.summary}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Open Media
                </button>
                <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Explore
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
            title="This media center can later support galleries, videos, stories, and official tournament coverage"
            subtitle="The platform is ready to expand into category-based galleries, media filters, player spotlights, highlight reels, and press publication workflows."
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}