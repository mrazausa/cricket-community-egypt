"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type AdminModule = {
  title: string;
  description: string;
  href: string;
  tag: string;
  group: string;
};

const adminModules: AdminModule[] = [

  {
    title: "Menu Control",
    description: "Show, hide and reorder public header menu items without editing code.",
    href: "/admin/menu-control",
    tag: "Platform",
    group: "Platform Control",
  },
  {
    title: "Page Block Control",
    description: "Show or hide public page sections such as homepage rankings, match center and player directory.",
    href: "/admin/page-control",
    tag: "Platform",
    group: "Platform Control",
  },
  {
    title: "Homepage Featured Tournament",
    description: "Select which tournament appears as the main homepage feature.",
    href: "/admin/homepage-featured-tournament",
    tag: "Homepage",
    group: "Homepage Control",
  },
  {
    title: "Homepage Visual",
    description: "Manage homepage visual blocks, hero images and display content.",
    href: "/admin/homepage-visual",
    tag: "Homepage",
    group: "Homepage Control",
  },
  {
    title: "Homepage Live Updates",
    description: "Create, edit, sort and delete rotating homepage live update cards.",
    href: "/admin/homepage-live-updates",
    tag: "Homepage",
    group: "Homepage Control",
  },

  {
    title: "Tournaments",
    description: "Create and manage tournament records, status, venue and format.",
    href: "/admin/tournaments",
    tag: "Tournament",
    group: "Tournament Control",
  },
  {
    title: "Tournament Design",
    description: "Control tournament page hero design and tournament display settings.",
    href: "/admin/tournament-design",
    tag: "Tournament",
    group: "Tournament Control",
  },
  {
    title: "Tournament Teams",
    description: "Manage tournament team display and participating teams.",
    href: "/admin/tournament-teams",
    tag: "Tournament",
    group: "Tournament Control",
  },

  {
    title: "Matches",
    description: "Create and manage fixtures, results, scorecards and match center.",
    href: "/admin/matches",
    tag: "Matches",
    group: "Match & Ranking",
  },
  {
    title: "Team Rankings",
    description: "Manage team rankings, table positions and ranking display data.",
    href: "/admin/team-rankings",
    tag: "Rankings",
    group: "Match & Ranking",
  },
  {
    title: "Player Rankings",
    description: "Manage top batsmen, bowlers, MVPs and player ranking data.",
    href: "/admin/player-rankings",
    tag: "Rankings",
    group: "Match & Ranking",
  },
  {
    title: "Ranking IDs",
    description: "Manage ranking references and ID mapping.",
    href: "/admin/rankings-ids",
    tag: "Rankings",
    group: "Match & Ranking",
  },
  {
    title: "Rankings",
    description: "Open the main ranking control panel.",
    href: "/admin/rankings",
    tag: "Rankings",
    group: "Match & Ranking",
  },

  {
    title: "Player Approvals",
    description: "Approve, reject or request changes for player registrations.",
    href: "/admin/player-approvals",
    tag: "Registration",
    group: "Registration Control",
  },
  {
    title: "Team Approvals",
    description: "Approve, reject or request changes for team registrations.",
    href: "/admin/team-approvals",
    tag: "Registration",
    group: "Registration Control",
  },
  {
    title: "Registrations",
    description: "View submitted team and player registration records.",
    href: "/admin/registrations",
    tag: "Registration",
    group: "Registration Control",
  },
  {
    title: "Team Squads",
    description: "Manage squad members, verified players and provisional players.",
    href: "/admin/team-squads",
    tag: "Squad",
    group: "Registration Control",
  },
  {
    title: "Team Squad Linking",
    description: "Link registered players with squad entries and player IDs.",
    href: "/admin/team-squad-linking",
    tag: "Squad",
    group: "Registration Control",
  },

  {
    title: "News",
    description: "Manage news, announcements and content posts.",
    href: "/admin/news",
    tag: "Content",
    group: "Content Control",
  },
];

const groupOrder = [
  "Platform Control",
  "Homepage Control",
  "Tournament Control",
  "Match & Ranking",
  "Registration Control",
  "Content Control",
];

type DashboardCount = {
  tournaments: number;
  teams: number;
  players: number;
  matches: number;
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<DashboardCount>({
    tournaments: 0,
    teams: 0,
    players: 0,
    matches: 0,
  });

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    setLoading(true);

    const [tournamentsRes, teamsRes, playersRes, matchesRes] = await Promise.all([
      supabase.from("tournaments").select("id", { count: "exact", head: true }),
      supabase.from("registration_teams").select("id", { count: "exact", head: true }),
      supabase.from("registration_players").select("id", { count: "exact", head: true }),
      supabase.from("matches").select("id", { count: "exact", head: true }),
    ]);

    setCounts({
      tournaments: tournamentsRes.count || 0,
      teams: teamsRes.count || 0,
      players: playersRes.count || 0,
      matches: matchesRes.count || 0,
    });

    setLoading(false);
  }

  const groupedModules = useMemo(() => {
    return groupOrder.map((group) => ({
      group,
      modules: adminModules.filter((item) => item.group === group),
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Admin Control Center
          </p>

          <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
            Manage Cricket Community Egypt from one clean dashboard.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            Use this panel to control homepage content, tournaments, matches,
            rankings, approvals, squads and platform content.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Tournaments" value={counts.tournaments} loading={loading} />
            <StatCard label="Team Registrations" value={counts.teams} loading={loading} />
            <StatCard label="Player Registrations" value={counts.players} loading={loading} />
            <StatCard label="Matches" value={counts.matches} loading={loading} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {groupedModules.map((group) => (
            <div key={group.group}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {group.group}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    {group.group}
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.modules.map((module) => (
                  <a
                    key={module.href}
                    href={module.href}
                    className="group rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl hover:ring-emerald-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {module.tag}
                        </span>

                        <h3 className="mt-4 text-xl font-bold text-slate-950 group-hover:text-emerald-700">
                          {module.title}
                        </h3>
                      </div>

                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white transition group-hover:bg-emerald-600">
                        →
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {module.description}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">
        {loading ? "..." : value}
      </p>
    </div>
  );
}