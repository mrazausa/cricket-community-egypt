"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type PlayerRow = {
  id: string;
  full_name: string | null;
  player_code: string | null;
  player_photo_url: string | null;
  role: string | null;
  current_team: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  city_base: string | null;
  preferred_tournament: string | null;
  notes: string | null;
  status: string | null;
  submitted_by_user_id: string | null;
};

function getInitial(value?: string | null, fallback = "P") {
  const text = (value || "").trim();
  return text ? text.charAt(0).toUpperCase() : fallback;
}

function formatStatus(status?: string | null) {
  if (!status) return "Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadge(status?: string | null) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "needs_changes") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function PlayerDetailPage() {
  const params = useParams();
  const code = String(params?.code || "");

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadPage();
  }, [code]);

  async function loadPage() {
    setLoading(true);

    const { data: playerRes, error: playerError } = await supabase
      .from("registration_players")
      .select("*")
      .eq("player_code", code)
      .maybeSingle();

    if (playerError || !playerRes) {
      setPlayer(null);
      setLoading(false);
      return;
    }

    const { data: userRes } = await supabase.auth.getUser();
    const currentUserId = userRes.user?.id || "";

    setPlayer(playerRes as PlayerRow);
    setIsOwner(!!currentUserId && currentUserId === playerRes.submitted_by_user_id);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading player page...
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!player) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Player not found.
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {player.player_photo_url ? (
              <img
                src={player.player_photo_url}
                alt={player.full_name || "Player"}
                className="h-28 w-28 rounded-3xl object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/10 text-4xl font-bold text-white ring-2 ring-white/20">
                {getInitial(player.full_name, "P")}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Player Page
              </p>
              <h1 className="text-3xl font-bold sm:text-5xl">
                {player.full_name || "Unnamed Player"}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                {player.player_code ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 font-semibold">
                    {player.player_code}
                  </span>
                ) : null}
                <span className={`rounded-full px-3 py-1 font-semibold ${getStatusBadge(player.status)}`}>
                  {formatStatus(player.status)}
                </span>
                {player.role ? (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {player.role}
                  </span>
                ) : null}
              </div>
            </div>

            {isOwner ? (
              <a
                href={`/register/player?id=${player.id}`}
                className="inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Edit Player
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Player Details
            </p>
            <h2 className="mt-3 text-2xl font-bold">Overview</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Role:</span> {player.role || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Current Team:</span> {player.current_team || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Batting Style:</span> {player.batting_style || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Bowling Style:</span> {player.bowling_style || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">City / Base:</span> {player.city_base || "Not set"}</p>
              <p><span className="font-semibold text-slate-900">Preferred Tournament:</span> {player.preferred_tournament || "Not set"}</p>
            </div>

            {player.notes ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {player.notes}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Quick Info
            </p>
            <h2 className="mt-3 text-2xl font-bold">Snapshot</h2>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Player ID:</span> {player.player_code || "Not generated"}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {formatStatus(player.status)}</p>
              <p><span className="font-semibold text-slate-900">Current Team:</span> {player.current_team || "Not set"}</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}