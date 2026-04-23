import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TeamInfo = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
};

type PlayerRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  full_name?: string | null;
  player_name?: string | null;
  display_name?: string | null;
  role?: string | null;
  badge?: string | null;
  base?: string | null;
  overview?: string | null;
  player_code?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  teams?: TeamInfo | TeamInfo[] | null;
  [key: string]: any;
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

type PlayerCardRow = PlayerRow & {
  ranking?: PlayerRankingRow | null;
};

function getPlayerName(player: PlayerRow) {
  return (
    player.name ||
    player.full_name ||
    player.player_name ||
    player.display_name ||
    "Unknown Player"
  );
}

function getPlayerImage(player: PlayerRow) {
  return (
    player.image_url ||
    player.photo_url ||
    player.avatar_url ||
    player.profile_image_url ||
    null
  );
}

function getPlayerRole(player: PlayerRow) {
  return player.role || player.badge || "Player";
}

function getPlayerBase(player: PlayerRow) {
  return player.base || "Egypt";
}

function getPlayerOverview(player: PlayerRow) {
  return player.overview || "Player profile and highlights will be updated soon.";
}

function getPlayerTeam(player: PlayerRow): TeamInfo | null {
  if (!player.teams) return null;
  if (Array.isArray(player.teams)) return player.teams[0] ?? null;
  return player.teams;
}

export default async function PlayersPage() {
  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select(
      `
      *,
      teams (
        id,
        name,
        slug
      )
    `
    )
    .order("created_at", { ascending: false });

  const { data: rankingsData } = await supabase
    .from("player_rankings")
    .select(
      "id, player_id, rank_position, category, rating, stat_value, season_label, updated_at"
    )
    .order("rank_position", { ascending: true });

  if (playersError) {
    console.error("Players page load error:", playersError);
  }

  const players = (playersData as PlayerRow[] | null) || [];
  const rankings = (rankingsData as PlayerRankingRow[] | null) || [];

  const rankingMap = new Map<string, PlayerRankingRow>();
  for (const row of rankings) {
    if (!row.player_id) continue;

    const existing = rankingMap.get(row.player_id);
    if (!existing) {
      rankingMap.set(row.player_id, row);
      continue;
    }

    const existingRank = existing.rank_position ?? 999999;
    const currentRank = row.rank_position ?? 999999;

    if (currentRank < existingRank) {
      rankingMap.set(row.player_id, row);
    }
  }

  const playerCards: PlayerCardRow[] = players.map((player) => ({
    ...player,
    ranking: rankingMap.get(player.id) || null,
  }));

  playerCards.sort((a, b) => {
    const aRank = a.ranking?.rank_position ?? 999999;
    const bRank = b.ranking?.rank_position ?? 999999;

    if (aRank !== bRank) return aRank - bRank;

    return getPlayerName(a).localeCompare(getPlayerName(b));
  });

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Players
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Explore Official Player Profiles
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Browse registered players, current ranking positions, playing roles, teams, and performance categories across Cricket Community Egypt.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Official Players
            </p>
            <h2 className="mt-1 text-3xl font-bold">Player Directory</h2>
          </div>

          <a
            href="/rankings"
            className="hidden rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-block"
          >
            View Rankings
          </a>
        </div>

        {playersError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load players.
          </div>
        ) : playerCards.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-md ring-1 ring-slate-200">
            No players found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {playerCards.map((player) => {
              const image = getPlayerImage(player);
              const playerName = getPlayerName(player);
              const team = getPlayerTeam(player);

              return (
                <a
                  key={player.id}
                  href={player.slug ? `/players/${player.slug}` : "/players"}
                  className="group rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {image ? (
                        <img
                          src={image}
                          alt={playerName}
                          className="h-14 w-14 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                          {playerName.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700">
                          {playerName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {getPlayerRole(player)}
                        </p>
                      </div>
                    </div>

                    {player.ranking?.rank_position ? (
                      <div className="rounded-2xl bg-slate-900 px-3 py-2 text-center text-white">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-300">
                          Rank
                        </p>
                        <p className="text-lg font-bold">
                          #{player.ranking.rank_position}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-slate-600">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                          Rank
                        </p>
                        <p className="text-lg font-bold">-</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <InfoBox label="Team" value={team?.name || "No Team"} />
                    <InfoBox label="Base" value={getPlayerBase(player)} />
                    <InfoBox label="Category" value={player.ranking?.category || "-"} />
                    <InfoBox label="Rating" value={player.ranking?.rating ?? "-"} />
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Overview
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {getPlayerOverview(player)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        Stat Snapshot
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {player.ranking?.stat_value || "Updating soon"}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">
                      View Player →
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}