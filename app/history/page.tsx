import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SectionTitle from "@/components/ui/section-title";

const historyMoments = [
  {
    title: "Early community cricket foundations",
    era: "Origins",
    summary:
      "The growth of cricket in Egypt began through passionate community participation, informal gatherings, and local enthusiasm for the game.",
  },
  {
    title: "Rise of organized tournaments",
    era: "Development",
    summary:
      "Structured cricket events, leagues, and memorial trophies created stronger competition, wider recognition, and a deeper sporting culture.",
  },
  {
    title: "Community-led cricket expansion",
    era: "Growth",
    summary:
      "Organizers, volunteers, teams, and supporters helped push cricket forward through dedication, event management, and long-term vision.",
  },
  {
    title: "Legacy tournaments and memorial events",
    era: "Heritage",
    summary:
      "Special tournaments built around tribute, remembrance, and honor have become an emotional and respected part of the cricket journey.",
  },
  {
    title: "Digital presentation and modern identity",
    era: "Modern Era",
    summary:
      "The next chapter of cricket in Egypt includes better digital presence, rankings, media visibility, archives, and structured public access.",
  },
  {
    title: "Future platform for Egypt cricket",
    era: "Next Phase",
    summary:
      "A premium website can preserve the past while supporting future tournaments, player recognition, team identity, and national cricket storytelling.",
  },
];

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Cricket Heritage
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Preserve the story, milestones, people, and legacy of cricket in Egypt.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            A premium archive space to document the journey of cricket in Egypt through community growth, tournaments, leadership, and unforgettable moments.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Historical Archive
            </p>
            <h2 className="mt-3 text-2xl font-bold">Legacy Driven</h2>
            <p className="mt-2 text-sm text-slate-600">
              A place to preserve major events, pioneers, memorable tournaments, and the timeline of cricket in Egypt.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Future Upgrade
            </p>
            <h2 className="mt-3 text-2xl font-bold">Interactive Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">
              This page can later grow into a full visual timeline with photos, videos, key figures, and historic achievements.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Cultural Value
            </p>
            <h2 className="mt-3 text-2xl font-bold">Community Memory</h2>
            <p className="mt-2 text-sm text-slate-600">
              A strong cricket platform should not only show scores and rankings, but also protect the emotional journey behind the sport.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="History"
          title="Cricket History Timeline in Egypt"
          subtitle="This section can later become a rich storytelling timeline covering origin, expansion, memorial events, major tournaments, and modern digital identity."
        />

        <div className="space-y-4">
          {historyMoments.map((item, index) => (
            <article
              key={item.title}
              className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      {item.era}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {item.title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      {item.summary}
                    </p>
                  </div>
                </div>

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
            title="This history section can evolve into a visual archive of Egypt cricket"
            subtitle="Later we can add photos, legends, memorial pages, milestone events, yearly timelines, historical tournament records, and tribute-driven storytelling."
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}