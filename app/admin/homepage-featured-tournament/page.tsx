"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title: string;
  slug: string;
  is_featured_home: boolean | null;
};

export default function HomepageFeaturedTournamentPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, slug, is_featured_home")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Failed to load tournaments.");
      setLoading(false);
      return;
    }

    const rows = (data || []) as TournamentRow[];
    setTournaments(rows);

    const currentFeatured = rows.find((item) => item.is_featured_home);
    if (currentFeatured) {
      setSelectedId(currentFeatured.id);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!selectedId) {
      setMessage("Please select a tournament first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: clearError } = await supabase
      .from("tournaments")
      .update({ is_featured_home: false })
      .neq("id", "");

    if (clearError) {
      setMessage("Failed to clear previous featured tournament.");
      setSaving(false);
      return;
    }

    const { error: setError } = await supabase
      .from("tournaments")
      .update({ is_featured_home: true })
      .eq("id", selectedId);

    if (setError) {
      setMessage("Failed to set featured tournament.");
      setSaving(false);
      return;
    }

    setMessage("Homepage featured tournament updated successfully.");
    setSaving(false);
    loadTournaments();
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Homepage Control
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Featured Tournament Selection
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Select one tournament to appear in the homepage hero section.
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Choose Tournament
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              disabled={loading || saving}
            >
              <option value="">Select featured tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Homepage Featured Tournament"}
          </button>

          {message ? (
            <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}