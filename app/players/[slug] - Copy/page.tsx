import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type PlayerRow = {
  id: string;
  name: string;
  slug: string;
  badge: string | null;
  role: string | null;
  base: string | null;
  overview: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  teams: {
    id: string;
    name: string | null;
    slug: string | null;
  } | null;
};

type TournamentRow = {
  tournaments: {
    id: string;
    title: string;
    slug: string;
    status: string;
    timeline: string | null;
  } | null;
};

type PlayerRankingRow = {
  id: string;
  player_id: string | null;
  rank_position: number | null;
  category: string | null;
  rating: number | null;
  stat_value: string | null;
  season_label: string | null;
  updated_at: string | null;
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

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: player, error: playerError } = await supabase
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
      batting_style,
      bowling_style,
      teams (
        id,
        name,
        slug
      )
    `
    )
    .eq("slug", slug)
    .single();

  if (playerError || !player) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Player not found</h1>
          <p className="mt-4 text-slate-600">
            The requested player page does not exist yet.
          </p>
          <a
            href="/players"
            className="mt-6 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Players
          </a>
        </section>

        <SiteFooter />
      </main>
    );
  }

  const { data: rankingRows } = await supabase
    .from("player_rankings")
    .select(
      "id, player_id, rank_position, category, rating, stat_value, season_label, updated_at"
    )
    .eq("player_id", player.id)
    .order("rank_position", { ascending: true });

  const playerRankings = (rankingRows as PlayerRankingRow[] | null) || [];
  const primaryRanking = playerRankings[0] ?? null;

  const { data: tournamentLinks, error: tournamentsError } = await supabase
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
    .eq("team_id", player.teams?.id ?? "");

  const tournamentList =
    ((tournamentLinks as TournamentRow[] | null) || [])
      .map((item) => item.tournaments)
      .filter(Boolean) as {
      id: string;
      title: string;
      slug: string;
      status: string;
      timeline: string | null;
    }[];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {player.badge || "Player"}
            </span>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {player.teams?.name || "No Team"}
            </span>

            {primaryRanking?.category ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {primaryRanking.category}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            {player.name}
          </h1>

          <p className="mt-2 text-sm font-semibold text-emerald-200">
            {player.role || "Player"} • {player.base || "Egypt"}
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            {player.overview || "Player overview will be updated soon."}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Current Rank
              </p>
              <p className="mt-2 font-semibold">
                {primaryRanking?.rank_position ? `#${primaryRanking.rank_position}` : "Not ranked yet"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Category
              </p>
              <p className="mt-2 font-semibold">
                {primaryRanking?.category || "Updating soon"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Rating
              </p>
              <p className="mt-2 font-semibold">{primaryRanking?.rating ?? "-"}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Season
              </p>
              <p className="mt-2 font-semibold">
                {primaryRanking?.season_label || "Current Season"}
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
              {primaryRanking?.rank_position ? `#${primaryRanking.rank_position}` : "-"}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Rating
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {primaryRanking?.rating ?? "-"}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Category
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {primaryRanking?.category || "-"}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Stat Value
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {primaryRanking?.stat_value || "-"}
            </h2>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Stats Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-bold">Profile Overview</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Role
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {player.role || "TBA"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Base
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {player.base || "Egypt"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Batting Style
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {player.batting_style || "Updating soon"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Bowling Style
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {player.bowling_style || "Updating soon"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Identity
          </p>
          <h2 className="mt-2 text-2xl font-bold">Player Profile</h2>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Name
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {player.name}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Team
              </p>
              {player.teams?.slug ? (
                <a
                  href={`/teams/${player.teams.slug}`}
                  className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {player.teams.name}
                </a>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {player.teams?.name || "No Team"}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Badge
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {player.badge || "Player"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Primary Ranking
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {primaryRanking?.rank_position
                  ? `#${primaryRanking.rank_position} • ${primaryRanking.category || "Category"}`
                  : "Not ranked yet"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Ranking Categories
          </p>
          <h2 className="mt-2 text-2xl font-bold">Player Ranking Snapshot</h2>

          {playerRankings.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {playerRankings.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {item.category || "Category"}
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {item.rank_position ? `#${item.rank_position}` : "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Stat: {item.stat_value || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Rating: {item.rating ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Season: {item.season_label || "Current Season"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
              Player rankings will be updated soon.
            </div>
          )}
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
            This player page can later support photos, rankings, match logs, and advanced stats
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            In later phases, each player page can include photo, batting style,
            bowling style, career summary, match-by-match records, awards,
            ranking movement, and tournament-specific statistics.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}