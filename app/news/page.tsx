"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title: string | null;
  slug: string | null;
};

type NewsRow = {
  id: string;
  tournament_id: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Date not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function PublicNewsPage() {
  const [newsRows, setNewsRows] = useState<NewsRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    loadNews(selectedTournamentId);
  }, [selectedTournamentId]);

  async function loadSetup() {
    const { data } = await supabase
      .from("tournaments")
      .select("id, title, slug")
      .order("created_at", { ascending: false });

    setTournaments((data || []) as TournamentRow[]);
  }

  async function loadNews(tournamentId?: string) {
    setLoading(true);

    let query = supabase
      .from("news")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (tournamentId) {
      query = query.eq("tournament_id", tournamentId);
    }

    const { data } = await query;
    setNewsRows((data || []) as NewsRow[]);
    setLoading(false);
  }

  const tournamentMap = useMemo(() => {
    return new Map(tournaments.map((item) => [item.id, item]));
  }, [tournaments]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            News Desk
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Latest cricket updates, results, and tournament announcements.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Follow the latest published stories, featured updates, and tournament news from the platform.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filter by Tournament
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">All Tournaments</option>
                {tournaments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || "Untitled Tournament"}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Published News
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {newsRows.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading news...
          </div>
        ) : newsRows.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            No published news found.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {newsRows.map((item) => {
              const tournament = item.tournament_id
                ? tournamentMap.get(item.tournament_id)
                : null;

              return (
                <article
                  key={item.id}
                  className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {item.is_featured ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Featured
                      </span>
                    ) : null}

                    {tournament?.title ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {tournament.title}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-slate-900">
                    {item.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {formatDate(item.created_at)}
                  </p>

                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="mt-4 h-52 w-full rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                  ) : null}

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {item.body || "News update"}
                  </p>

                  {tournament?.slug ? (
                    <div className="mt-5">
                      <a
                        href={`/tournaments/${tournament.slug}`}
                        className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Open Tournament
                      </a>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}