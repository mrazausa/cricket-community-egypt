"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type TournamentRow = {
  id: string;
  title: string | null;
  slug: string | null;
  status: string | null;
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
  updated_at?: string | null;
};

type NewsForm = {
  tournament_id: string;
  title: string;
  body: string;
  image_url: string;
  is_published: boolean;
  is_featured: boolean;
  sort_order: string;
};

const emptyForm: NewsForm = {
  tournament_id: "",
  title: "",
  body: "",
  image_url: "",
  is_published: true,
  is_featured: false,
  sort_order: "0",
};

function formatError(error: any) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AdminNewsPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [newsRows, setNewsRows] = useState<NewsRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [form, setForm] = useState<NewsForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    loadNews(selectedTournamentId);
  }, [selectedTournamentId]);

  async function loadSetup() {
    setLoadingSetup(true);
    setMessage("");
    setMessageType("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, slug, status")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to load tournaments. ${formatError(error)}`);
      setMessageType("error");
      setLoadingSetup(false);
      return;
    }

    const rows = (data || []) as TournamentRow[];
    setTournaments(rows);

    if (rows.length > 0) {
      setSelectedTournamentId((prev) => prev || rows[0].id);
      setForm((prev) => ({
        ...prev,
        tournament_id: prev.tournament_id || rows[0].id,
      }));
    }

    setLoadingSetup(false);
  }

  async function loadNews(tournamentId?: string) {
    setLoadingNews(true);

    let query = supabase
      .from("news")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (tournamentId) {
      query = query.eq("tournament_id", tournamentId);
    }

    const { data, error } = await query;

    if (error) {
      setNewsRows([]);
      setMessage(`Failed to load news. ${formatError(error)}`);
      setMessageType("error");
      setLoadingNews(false);
      return;
    }

    setNewsRows((data || []) as NewsRow[]);
    setLoadingNews(false);
  }

  function resetForm(tournamentId?: string) {
    setEditingId(null);
    setForm({
      ...emptyForm,
      tournament_id: tournamentId || selectedTournamentId || "",
    });
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setMessage("Title is required.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    const payload = {
      tournament_id: form.tournament_id || null,
      title: form.title.trim(),
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      is_published: !!form.is_published,
      is_featured: !!form.is_featured,
      sort_order: form.sort_order === "" ? 0 : Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("news")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setMessage("News updated successfully.");
      } else {
        const { error } = await supabase.from("news").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        setMessage("News created successfully.");
      }

      setMessageType("success");
      await loadNews(form.tournament_id);
      resetForm(form.tournament_id);
    } catch (error) {
      setMessage(`Failed to save news. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: NewsRow) {
    setEditingId(row.id);
    setForm({
      tournament_id: row.tournament_id || "",
      title: row.title || "",
      body: row.body || "",
      image_url: row.image_url || "",
      is_published: !!row.is_published,
      is_featured: !!row.is_featured,
      sort_order: row.sort_order?.toString() ?? "0",
    });
    setSelectedTournamentId(row.tournament_id || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this news item?");
    if (!ok) return;

    setDeletingId(id);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;

      setMessage("News deleted successfully.");
      setMessageType("success");

      if (editingId === id) {
        resetForm(selectedTournamentId);
      }

      await loadNews(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to delete news. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            News Control
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Publish tournament updates, result announcements, and featured news.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Use this page to post the latest Azhar Cricket Trophy updates, match result
            headlines, player of the match announcements, and tournament news.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Admin News
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {editingId ? "Edit News" : "Create News"}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => resetForm(selectedTournamentId)}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Form
            </button>
          </div>

          {message ? (
            <div
              className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
                messageType === "error"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {message}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <FieldSelect
              label="Tournament"
              value={form.tournament_id}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, tournament_id: value }));
                setSelectedTournamentId(value);
              }}
              options={tournaments.map((item) => ({
                value: item.id,
                label: item.title || "Untitled Tournament",
              }))}
            />

            <Field
              label="Sort Order"
              type="number"
              value={form.sort_order}
              onChange={(value) => setForm((prev) => ({ ...prev, sort_order: value }))}
              placeholder="0"
            />

            <div className="md:col-span-2">
              <Field
                label="Title"
                value={form.title}
                onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
                placeholder="Azhar Trophy opens with a thrilling first match"
              />
            </div>

            <div className="md:col-span-2">
              <FieldTextarea
                label="Body"
                value={form.body}
                onChange={(value) => setForm((prev) => ({ ...prev, body: value }))}
                placeholder="Write the update, result summary, or latest announcement here..."
                rows={5}
              />
            </div>

            <div className="md:col-span-2">
              <Field
                label="Image URL"
                value={form.image_url}
                onChange={(value) => setForm((prev) => ({ ...prev, image_url: value }))}
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
              <label className="mt-1 flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_published: e.target.checked,
                    }))
                  }
                />
                Published
              </label>

              <label className="mt-1 flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_featured: e.target.checked,
                    }))
                  }
                />
                Featured News
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingSetup}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update News" : "Create News"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Existing News
              </p>
              <h2 className="mt-2 text-2xl font-bold">Tournament News List</h2>
            </div>

            <div className="w-full md:w-72">
              <FieldSelect
                label="Filter by Tournament"
                value={selectedTournamentId}
                onChange={(value) => {
                  setSelectedTournamentId(value);
                  setForm((prev) => ({
                    ...prev,
                    tournament_id: value || prev.tournament_id,
                  }));
                }}
                options={[
                  { value: "", label: "All Tournaments" },
                  ...tournaments.map((item) => ({
                    value: item.id,
                    label: item.title || "Untitled Tournament",
                  })),
                ]}
              />
            </div>
          </div>

          {loadingNews || loadingSetup ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              Loading news...
            </div>
          ) : newsRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              No news found.
            </div>
          ) : (
            <div className="space-y-4">
              {newsRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-3xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            row.is_published
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.is_published ? "Published" : "Draft"}
                        </span>

                        {row.is_featured ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Featured
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">
                        {row.title}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {row.body || "No body text"}
                      </p>

                      <p className="text-sm text-slate-500">
                        Created: {formatDate(row.created_at)}
                      </p>

                      {row.image_url ? (
                        <p className="text-sm text-slate-500">
                          Image URL: {row.image_url}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      >
        {options.map((item) => (
          <option key={`${label}-${item.value}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}