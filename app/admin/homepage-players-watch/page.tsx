"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type WatchPlayer = {
  id: string;
  player_name: string;
  team_name: string | null;
  tag: string | null;
  description: string | null;
  photo_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormState = {
  player_name: string;
  team_name: string;
  tag: string;
  description: string;
  photo_url: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  player_name: "",
  team_name: "",
  tag: "Rising Star",
  description: "",
  photo_url: "",
  sort_order: "1",
  is_active: true,
};

const tagOptions = [
  "Rising Star",
  "Match Winner",
  "Power Hitter",
  "All-Round Impact",
  "Young Talent",
  "Player to Watch",
];

export default function HomepagePlayersWatchAdminPage() {
  const [rows, setRows] = useState<WatchPlayer[]>([]);
  const [formById, setFormById] = useState<Record<string, FormState>>({});
  const [newForm, setNewForm] = useState<FormState>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("homepage_players_to_watch")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setRows([]);
      setFormById({});
      setErrorText(error.message || "Failed to load players to watch.");
      setLoading(false);
      return;
    }

    const safeRows = (data || []) as WatchPlayer[];
    setRows(safeRows);
    const next: Record<string, FormState> = {};
    for (const row of safeRows) next[row.id] = rowToForm(row);
    setFormById(next);
    setLoading(false);
  }

  function rowToForm(row: WatchPlayer): FormState {
    return {
      player_name: row.player_name || "",
      team_name: row.team_name || "",
      tag: row.tag || "",
      description: row.description || "",
      photo_url: row.photo_url || "",
      sort_order: row.sort_order?.toString() || "0",
      is_active: row.is_active ?? true,
    };
  }

  function toPayload(form: FormState) {
    return {
      player_name: form.player_name.trim(),
      team_name: form.team_name.trim() || null,
      tag: form.tag.trim() || null,
      description: form.description.trim() || null,
      photo_url: form.photo_url.trim() || null,
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
  }

  async function createRow() {
    if (!newForm.player_name.trim()) {
      setErrorText("Player name is required.");
      return;
    }

    setCreating(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("homepage_players_to_watch")
      .insert({ ...toPayload(newForm), created_at: new Date().toISOString() });

    if (error) {
      setErrorText(error.message || "Failed to create player to watch.");
      setCreating(false);
      return;
    }

    setNewForm({ ...EMPTY_FORM, sort_order: String(rows.length + 1) });
    setMessage("Player added to homepage watchlist.");
    setCreating(false);
    loadRows();
  }

  async function saveRow(id: string) {
    const form = formById[id];
    if (!form?.player_name.trim()) {
      setErrorText("Player name is required.");
      return;
    }

    setSavingId(id);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("homepage_players_to_watch")
      .update(toPayload(form))
      .eq("id", id);

    if (error) {
      setErrorText(error.message || "Failed to save player.");
      setSavingId(null);
      return;
    }

    setMessage("Player watchlist row saved.");
    setSavingId(null);
    loadRows();
  }

  async function deleteRow(id: string) {
    const ok = window.confirm("Delete this player from Players to Watch?");
    if (!ok) return;

    setSavingId(id);
    const { error } = await supabase.from("homepage_players_to_watch").delete().eq("id", id);
    if (error) {
      setErrorText(error.message || "Failed to delete player.");
      setSavingId(null);
      return;
    }
    setMessage("Player removed from homepage watchlist.");
    setSavingId(null);
    loadRows();
  }

  async function uploadPhoto(file: File, id: string | "new") {
    const isNew = id === "new";
    if (isNew) setUploadingNew(true);
    else setUploadingId(id);
    setMessage("");
    setErrorText("");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `players-watch/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("ranking-media")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setErrorText(`Photo upload failed. Check ranking-media bucket policy. ${uploadError.message}`);
      setUploadingNew(false);
      setUploadingId(null);
      return;
    }

    const { data } = supabase.storage.from("ranking-media").getPublicUrl(path);
    const url = data.publicUrl;

    if (isNew) {
      setNewForm((prev) => ({ ...prev, photo_url: url }));
      setUploadingNew(false);
    } else {
      setFormById((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || EMPTY_FORM), photo_url: url },
      }));
      setUploadingId(null);
    }
  }

  const activeCount = useMemo(() => rows.filter((row) => row.is_active !== false).length, [rows]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Homepage Control
          </p>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
            Players to Watch
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            Editorially feature selected players on the homepage without changing official Top Players rankings.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-6 sm:px-6 lg:grid-cols-3 lg:px-8">
        <StatCard label="Total Rows" value={rows.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Homepage Limit" value={5} />
      </section>

      {(message || errorText) && (
        <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <div className={`rounded-2xl px-5 py-4 text-sm font-semibold ${errorText ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {errorText || message}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Add Watch Player</p>
          <h2 className="mt-2 text-2xl font-bold">Create homepage player card</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-6">
            <Field label="Player Name" value={newForm.player_name} onChange={(v) => setNewForm((p) => ({ ...p, player_name: v }))} />
            <Field label="Team Name" value={newForm.team_name} onChange={(v) => setNewForm((p) => ({ ...p, team_name: v }))} />
            <SelectField label="Tag" value={newForm.tag} options={tagOptions} onChange={(v) => setNewForm((p) => ({ ...p, tag: v }))} />
            <Field label="Sort" value={newForm.sort_order} onChange={(v) => setNewForm((p) => ({ ...p, sort_order: v }))} />
            <label className="flex h-[68px] items-center justify-between rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
              Active
              <input type="checkbox" checked={newForm.is_active} onChange={(e) => setNewForm((p) => ({ ...p, is_active: e.target.checked }))} />
            </label>
            <label className="flex h-[68px] cursor-pointer items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
              {uploadingNew ? "Uploading..." : "Upload Photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(file, "new"); }} />
            </label>
          </div>

          <textarea
            value={newForm.description}
            onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Short player highlight / why to watch"
            className="mt-4 min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          {newForm.photo_url ? <p className="mt-2 truncate text-xs text-slate-500">Photo: {newForm.photo_url}</p> : null}

          <button
            type="button"
            onClick={createRow}
            disabled={creating}
            className="mt-5 inline-flex h-12 items-center rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Player Card"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Existing Watchlist</p>
              <h2 className="mt-2 text-2xl font-bold">Edit homepage players</h2>
            </div>
            <button type="button" onClick={loadRows} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Refresh</button>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Loading players to watch...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">No players added yet.</div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => {
                const form = formById[row.id] || rowToForm(row);
                return (
                  <div key={row.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 lg:grid-cols-[72px_1fr_1fr_1fr_90px_110px] lg:items-center">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-lg font-black text-emerald-800">
                        {form.photo_url ? <img src={form.photo_url} alt={form.player_name} className="h-full w-full object-cover" /> : initials(form.player_name || "P")}
                      </div>
                      <Field label="Player Name" value={form.player_name} onChange={(v) => setFormById((p) => ({ ...p, [row.id]: { ...form, player_name: v } }))} />
                      <Field label="Team Name" value={form.team_name} onChange={(v) => setFormById((p) => ({ ...p, [row.id]: { ...form, team_name: v } }))} />
                      <SelectField label="Tag" value={form.tag} options={tagOptions} onChange={(v) => setFormById((p) => ({ ...p, [row.id]: { ...form, tag: v } }))} />
                      <Field label="Sort" value={form.sort_order} onChange={(v) => setFormById((p) => ({ ...p, [row.id]: { ...form, sort_order: v } }))} />
                      <label className="flex h-[58px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
                        Active
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setFormById((p) => ({ ...p, [row.id]: { ...form, is_active: e.target.checked } }))} />
                      </label>
                    </div>

                    <textarea
                      value={form.description}
                      onChange={(e) => setFormById((p) => ({ ...p, [row.id]: { ...form, description: e.target.value } }))}
                      className="mt-4 min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                      placeholder="Short player highlight"
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold">
                        {uploadingId === row.id ? "Uploading..." : "Upload Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(file, row.id); }} />
                      </label>
                      <button type="button" onClick={() => saveRow(row.id)} disabled={savingId === row.id} className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-60">
                        {savingId === row.id ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={() => deleteRow(row.id)} disabled={savingId === row.id} className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 disabled:opacity-60">
                        Delete
                      </button>
                      {form.photo_url ? <span className="max-w-md truncate text-xs text-slate-500">{form.photo_url}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500"
      >
        {options.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "P").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}
