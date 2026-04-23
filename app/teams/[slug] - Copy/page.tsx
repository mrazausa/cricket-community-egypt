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
};

type PlayerRow = {
  id: string;
  name: string;
  slug: string;
  role: string | null;
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

type TournamentLinkRow = {
  tournaments: {
    id: string;
    title: string;
    slug: string;
    status: string;
    timeline: string | null;
  } | null;
};

function getStatusStyles(status: string) {
  switch (status) {
    case "live":
      return "bg-red-100 text-red-600";
    case "featured":
      return "bg-emerald-100 text-emerald-700";
    case "completed":
      return "bg-slate-200 text-slate-700";
    case "upcoming":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string) {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function splitForm(form: string | null) {
  if (!form) return [];
  return form.replace(/\s+/g, "").split("");
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, slug, badge, captain, base, titles, overview")
    .eq("slug", slug)
    .single();

  if (teamError || !team) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Team not found</h1>
          <p className="mt-4 text-slate-600">
            The requested team page does not exist yet.
          </p>
          <a
            href="/teams"
            className="mt-6 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Teams
          </a>
        </section>

        <SiteFooter />
      </main>
    );
  }

  const { data: squad, error: squadError } = await supabase
    .from("players")
    .select("id, name, slug, role")
    .eq("team_id", team.id)
    .order("created_at", { ascending: true });

  const { data: rankingRows } = await supabase
    .from("team_rankings")
    .select(
      "id, team_id, rank_position, points, matches, wins, form, rating, season_label, updated_at"
    )
    .eq("team_id", team.id)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  const ranking =
    ((rankingRows as TeamRankingRow[] | null) || [])[0] ?? null;

  const { data: tournamentTeams, error: tournamentsError } = await supabase
    .from("tournament_teams")
    .select(
      `
      tournaments (
        id,
        title,
        slug,
        status,
        timeline
      )
    `
    )
    .eq("team_id", team.id);

  const tournamentList =
    ((tournamentTeams as TournamentLinkRow[] | null) || [])
      .map((item) => item.tournaments)
      .filter(Boolean) as {
      id: string;
      title: string;
      slug: string;
      status: string;
      timeline: string | null;
    }[];

  const formList = splitForm(ranking?.form ?? null);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {team.badge || "Team"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {team.base || "Egypt"}
            </span>
            {ranking?.season_label ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {ranking.season_label}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            {team.name}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            {team.overview || "Team overview will be updated soon."}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Captain
              </p>
              <p className="mt-2 font-semibold">{team.captain || "TBA"}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Base
              </p>
              <p className="mt-2 font-semibold">{team.base || "Egypt"}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Record
              </p>
              <p className="mt-2 font-semibold">{team.titles || "Updating soon"}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Current Rank
              </p>
              <p className="mt-2 font-semibold">
                {ranking?.rank_position ? `#${ranking.rank_position}` : "Not ranked yet"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Rank
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {ranking?.rank_position ? `#${ranking.rank_position}` : "-"}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Points
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {ranking?.points ?? "-"}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Wins / Matches
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {ranking?.wins ?? "-"}
              <span className="mx-1 text-slate-400">/</span>
              {ranking?.matches ?? "-"}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Rating
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {ranking?.rating ?? "-"}
            </h2>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Squad
          </p>
          <h2 className="mt-2 text-2xl font-bold">Team Squad Snapshot</h2>

          {squadError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              Error loading squad.
            </div>
          ) : (squad as PlayerRow[] | null)?.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(squad as PlayerRow[]).map((player) => (
                <a
                  key={player.id}
                  href={`/players/${player.slug}`}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {player.name}
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {player.role || "Player"}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
              Squad will be updated soon.
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Ranking Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-bold">Current Standing</h2>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Team Name
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {team.name}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Current Rank
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {ranking?.rank_position ? `#${ranking.rank_position}` : "Not ranked yet"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Season
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {ranking?.season_label || "Current Season"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Form
              </p>
              {formList.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formList.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Updating soon
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Tournament Presence
          </p>
          <h2 className="mt-2 text-2xl font-bold">Participation Overview</h2>

          {tournamentsError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              Error loading tournament participation.
            </div>
          ) : tournamentList.length > 0 ? (
            <div className="mt-5 space-y-3">
              {tournamentList.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <a
                      href={`/tournaments/${item.slug}`}
                      className="font-semibold text-slate-900 hover:text-emerald-700"
                    >
                      {item.title}
                    </a>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.timeline || "Tournament"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(
                      item.status
                    )}`}
                  >
                    {formatStatus(item.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
              Tournament participation will be updated soon.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Next Phase
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            This team page can later support logos, squad photos, stats, and title history
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            In later phases, each team page can include logo, detailed squad profiles,
            match results, team statistics, gallery, title history, ranking movement,
            and tournament-specific records.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}