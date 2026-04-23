"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";
import AdminNav from "@/components/admin/admin-nav";

type RegistrationPlayerRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city_base: string | null;
  role: string | null;
  current_team: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  preferred_tournament: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function generatePlayerCode(serial: number) {
  return `CCE-P-${String(serial).padStart(4, "0")}`;
}

export default function AdminPlayerApprovalsPage() {
  const [players, setPlayers] = useState<RegistrationPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPendingPlayers() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("registration_players")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setPlayers([]);
    } else {
      setPlayers((data || []) as RegistrationPlayerRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPendingPlayers();
  }, []);

  async function approvePlayer(reg: RegistrationPlayerRow) {
    try {
      setProcessingId(reg.id);
      setMessage("");
      setErrorMessage("");

      const baseSlug = slugify(reg.full_name);
      let finalSlug = baseSlug || `player-${Date.now()}`;

      const { data: existingSlugRows, error: slugCheckError } = await supabase
        .from("players")
        .select("slug")
        .like("slug", `${baseSlug}%`);

      if (slugCheckError) throw slugCheckError;

      if ((existingSlugRows || []).length > 0) {
        finalSlug = `${baseSlug}-${(existingSlugRows || []).length + 1}`;
      }

      let teamId: string | null = null;

      if (reg.current_team && reg.current_team.trim()) {
        const requestedTeamSlug = slugify(reg.current_team);

        const { data: existingTeam, error: teamError } = await supabase
          .from("teams")
          .select("id, name, slug")
          .eq("slug", requestedTeamSlug)
          .maybeSingle();

        if (teamError) throw teamError;

        if (existingTeam?.id) {
          teamId = existingTeam.id;
        }
      }

      const { count, error: countError } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      const nextSerial = (count || 0) + 1;
      const playerCode = generatePlayerCode(nextSerial);

      const { error: insertError } = await supabase.from("players").insert([
        {
          name: reg.full_name,
          slug: finalSlug,
          badge: "Registered Player",
          role: reg.role || "Player",
          team_id: teamId,
          base: reg.city_base || "Egypt",
          overview:
            reg.notes?.trim() ||
            `${reg.full_name} joined the Cricket Community Egypt platform through player registration.`,
          batting_style: reg.batting_style || null,
          bowling_style: reg.bowling_style || null,
          is_featured: false,
          player_code: playerCode,
        },
      ]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("registration_players")
        .update({ status: "approved" })
        .eq("id", reg.id);

      if (updateError) throw updateError;

      setMessage(`${reg.full_name} approved successfully with code ${playerCode}.`);
      await loadPendingPlayers();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to approve player.");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectPlayer(id: string, name: string) {
    try {
      setProcessingId(id);
      setMessage("");
      setErrorMessage("");

      const { error } = await supabase
        .from("registration_players")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      setMessage(`${name} registration marked as rejected.`);
      await loadPendingPlayers();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to reject player.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
	  <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold">Admin – Player Approvals</h1>
        <p className="mb-8 text-sm text-slate-600">
          Review pending player registrations and convert them into official player profiles.
        </p>

        {message ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading pending player registrations...
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            No pending player registrations found.
          </div>
        ) : (
          <div className="space-y-5">
            {players.map((player) => (
              <div
                key={player.id}
                className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold">{player.full_name}</h2>

                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-900">Role:</span>{" "}
                        {player.role || "TBA"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Phone:</span>{" "}
                        {player.phone || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Email:</span>{" "}
                        {player.email || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">City:</span>{" "}
                        {player.city_base || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Current Team:</span>{" "}
                        {player.current_team || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Preferred Tournament:</span>{" "}
                        {player.preferred_tournament || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Batting Style:</span>{" "}
                        {player.batting_style || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Bowling Style:</span>{" "}
                        {player.bowling_style || "N/A"}
                      </p>
                    </div>

                    <div className="pt-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">Notes:</span>{" "}
                      {player.notes || "No notes"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => approvePlayer(player)}
                      disabled={processingId === player.id}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingId === player.id ? "Processing..." : "Approve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectPlayer(player.id, player.full_name)}
                      disabled={processingId === player.id}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}