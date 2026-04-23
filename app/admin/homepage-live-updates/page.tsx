"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

const MEDIA_BUCKET = "site-media";

type LiveUpdateRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  info_1_label: string | null;
  info_1_value: string | null;
  info_2_label: string | null;
  info_2_value: string | null;
  info_3_label: string | null;
  info_3_value: string | null;
  button_text: string | null;
  button_link: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type FormState = {
  title: string;
  subtitle: string;
  image_url: string;
  info_1_label: string;
  info_1_value: string;
  info_2_label: string;
  info_2_value: string;
  info_3_label: string;
  info_3_value: string;
  button_text: string;
  button_link: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  image_url: "",
  info_1_label: "Info 1",
  info_1_value: "",
  info_2_label: "Info 2",
  info_2_value: "",
  info_3_label: "Info 3",
  info_3_value: "",
  button_text: "Open Match Center",
  button_link: "/matches",
  sort_order: "1",
  is_active: true,
};

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "png";
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapRowToForm(row: LiveUpdateRow): FormState {
  return {
    title: row.title || "",
    subtitle: row.subtitle || "",
    image_url: row.image_url || "",
    info_1_label: row.info_1_label || "Info 1",
    info_1_value: row.info_1_value || "",
    info_2_label: row.info_2_label || "Info 2",
    info_2_value: row.info_2_value || "",
    info_3_label: row.info_3_label || "Info 3",
    info_3_value: row.info_3_value || "",
    button_text: row.button_text || "Open Match Center",
    button_link: row.button_link || "/matches",
    sort_order: row.sort_order?.toString() || "1",
    is_active: !!row.is_active,
  };
}

export default function AdminHomepageLiveUpdatesPage() {
  const [rows, setRows] = useState<LiveUpdateRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function loadRows() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("homepage_live_updates")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setRows([]);
      setErrorText(error.message || "Failed to load homepage live updates.");
      setLoading(false);
      return;
    }

    setRows((data || []) as LiveUpdateRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRows();
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startCreate() {
    const nextSortOrder =
      rows.length > 0
        ? Math.max(...rows.map((row) => row.sort_order || 0)) + 1
        : 1;

    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      sort_order: String(nextSortOrder),
    });
    setMessage("");
    setErrorText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(row: LiveUpdateRow) {
    setEditingId(row.id);
    setForm(mapRowToForm(row));
    setMessage("");
    setErrorText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImageUpload(file: File) {
    try {
      setUploading(true);
      setMessage("");
      setErrorText("");

      const fileExt = getFileExtension(file.name);
      const safeTitle =
        (form.title || "live-update")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-") || "live-update";

      const fileName = `${safeTitle}-${Date.now()}.${fileExt}`;
      const filePath = `homepage/live-updates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filePath);

      updateField("image_url", data.publicUrl);
      setMessage("Image uploaded successfully.");
    } catch (error: any) {
      console.error(error);
      setErrorText(error?.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");
      setErrorText("");

      const payload = {
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        image_url: form.image_url.trim() || null,
        info_1_label: form.info_1_label.trim() || null,
        info_1_value: form.info_1_value.trim() || null,
        info_2_label: form.info_2_label.trim() || null,
        info_2_value: form.info_2_value.trim() || null,
        info_3_label: form.info_3_label.trim() || null,
        info_3_value: form.info_3_value.trim() || null,
        button_text: form.button_text.trim() || null,
        button_link: form.button_link.trim() || null,
        sort_order: toNullableNumber(form.sort_order) ?? 1,
        is_active: !!form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("homepage_live_updates")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage("Live update updated successfully.");
      } else {
        const { error } = await supabase
          .from("homepage_live_updates")
          .insert(payload);

        if (error) throw error;
        setMessage("Live update created successfully.");
      }

      startCreate();
      await loadRows();
    } catch (error: any) {
      console.error(error);
      setErrorText(error?.message || "Failed to save live update.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this live update?");
    if (!ok) return;

    try {
      setMessage("");
      setErrorText("");

      const { error } = await supabase
        .from("homepage_live_updates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (editingId === id) {
        startCreate();
      }

      setMessage("Live update deleted successfully.");
      await loadRows();
    } catch (error: any) {
      console.error(error);
      setErrorText(error?.message || "Failed to delete live update.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Homepage Live Updates
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Manage rotating right-side homepage updates.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Use this for match flyers, second match updates, player of the
            match, result visuals, and live tournament notices. Homepage will
            auto-rotate them using sort order.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  {editingId ? "Edit Live Update" : "Create Live Update"}
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {editingId ? "Update live update card" : "Add a new live update"}
                </h2>
              </div>

              <div className="flex gap-2">
                {editingId ? (
                  <button
                    onClick={startCreate}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel Edit
                  </button>
                ) : null}

                <button
                  onClick={startCreate}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-300 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  New Update
                </button>
              </div>
            </div>

            {message ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            {errorText ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorText}
              </div>
            ) : null}

            <div className="grid gap-4">
              <Field
                label="Title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                placeholder="India Blue vs Mufaddal XI"
              />

              <Field
                label="Subtitle"
                value={form.subtitle}
                onChange={(value) => updateField("subtitle", value)}
                placeholder="Al-Azhar - Cairo"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Update Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                />

                <p className="mt-2 text-xs text-slate-500">
                  {uploading
                    ? "Uploading image..."
                    : "Upload flyer/poster directly from here."}
                </p>

                {form.image_url ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <img
                      src={form.image_url}
                      alt="Live update preview"
                      className="max-h-72 w-full rounded-xl object-contain"
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Info 1 Label"
                  value={form.info_1_label}
                  onChange={(value) => updateField("info_1_label", value)}
                  placeholder="Match Day"
                />
                <Field
                  label="Info 1 Value"
                  value={form.info_1_value}
                  onChange={(value) => updateField("info_1_value", value)}
                  placeholder="Friday"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Info 2 Label"
                  value={form.info_2_label}
                  onChange={(value) => updateField("info_2_label", value)}
                  placeholder="Time"
                />
                <Field
                  label="Info 2 Value"
                  value={form.info_2_value}
                  onChange={(value) => updateField("info_2_value", value)}
                  placeholder="09:00 AM to 12:00 P.M"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Info 3 Label"
                  value={form.info_3_label}
                  onChange={(value) => updateField("info_3_label", value)}
                  placeholder="Venue"
                />
                <Field
                  label="Info 3 Value"
                  value={form.info_3_value}
                  onChange={(value) => updateField("info_3_value", value)}
                  placeholder="Al Azhar Ground"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Button Text"
                  value={form.button_text}
                  onChange={(value) => updateField("button_text", value)}
                  placeholder="Open Match Center"
                />
                <Field
                  label="Button Link"
                  value={form.button_link}
                  onChange={(value) => updateField("button_link", value)}
                  placeholder="/matches"
                />
                <Field
                  label="Sort Order"
                  value={form.sort_order}
                  onChange={(value) => updateField("sort_order", value)}
                  placeholder="1"
                  type="number"
                />
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                />
                Active on homepage rotation
              </label>

              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? editingId
                    ? "Updating..."
                    : "Creating..."
                  : editingId
                    ? "Update Live Update"
                    : "Create Live Update"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Existing Live Updates
                </p>
                <h2 className="mt-1 text-2xl font-bold">Homepage rotation cards</h2>
              </div>

              <button
                onClick={loadRows}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Loading live updates...
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No live updates found yet.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                              {row.title || "Untitled Update"}
                            </h3>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Sort {row.sort_order ?? 0}
                            </span>
                            {row.is_active ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Inactive
                              </span>
                            )}
                          </div>

                          {row.subtitle ? (
                            <p className="mt-1 text-sm text-slate-500">
                              {row.subtitle}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(row)}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {row.image_url ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                          <img
                            src={row.image_url}
                            alt={row.title || "Live update"}
                            className="max-h-48 w-full rounded-xl object-contain"
                          />
                        </div>
                      ) : null}

                      <div className="grid gap-2 sm:grid-cols-3">
                        <MiniInfoRow
                          label={row.info_1_label || "Info 1"}
                          value={row.info_1_value || "—"}
                        />
                        <MiniInfoRow
                          label={row.info_2_label || "Info 2"}
                          value={row.info_2_value || "—"}
                        />
                        <MiniInfoRow
                          label={row.info_3_label || "Info 3"}
                          value={row.info_3_value || "—"}
                        />
                      </div>

                      <div className="text-sm text-slate-600">
                        Button: {row.button_text || "N/A"} · Link:{" "}
                        {row.button_link || "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function MiniInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}