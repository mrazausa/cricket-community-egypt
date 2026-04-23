"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

const MEDIA_BUCKET = "site-media";

type VisualRow = {
  id: string;
  eyebrow: string | null;
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
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormState = {
  eyebrow: string;
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
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  eyebrow: "MATCHDAY HIGHLIGHT",
  title: "",
  subtitle: "",
  image_url: "",
  info_1_label: "Match Day",
  info_1_value: "",
  info_2_label: "Time",
  info_2_value: "",
  info_3_label: "Venue",
  info_3_value: "",
  button_text: "Open Match Center",
  button_link: "/matches",
  is_active: true,
};

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "png";
}

export default function AdminHomepageVisualPage() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    loadVisual();
  }, []);

  async function loadVisual() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("homepage_featured_visuals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setErrorText(error.message || "Failed to load homepage visual.");
      setLoading(false);
      return;
    }

    if (data) {
      const row = data as VisualRow;
      setRowId(row.id);
      setForm({
        eyebrow: row.eyebrow || "",
        title: row.title || "",
        subtitle: row.subtitle || "",
        image_url: row.image_url || "",
        info_1_label: row.info_1_label || "",
        info_1_value: row.info_1_value || "",
        info_2_label: row.info_2_label || "",
        info_2_value: row.info_2_value || "",
        info_3_label: row.info_3_label || "",
        info_3_value: row.info_3_value || "",
        button_text: row.button_text || "",
        button_link: row.button_link || "",
        is_active: !!row.is_active,
      });
      setPreviewUrl(row.image_url || "");
    } else {
      setRowId(null);
      setForm(EMPTY_FORM);
      setPreviewUrl("");
    }

    setLoading(false);
  }

  async function handleImageUpload(file: File) {
    try {
      setUploading(true);
      setMessage("");
      setErrorText("");

      const ext = getFileExtension(file.name);
      const filePath = `homepage/featured-visual-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setForm((prev) => ({ ...prev, image_url: publicUrl }));
      setPreviewUrl(publicUrl);
      setMessage("Image uploaded successfully.");
    } catch (error: any) {
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
        eyebrow: form.eyebrow.trim() || null,
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
        is_active: !!form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (rowId) {
        const { error } = await supabase
          .from("homepage_featured_visuals")
          .update(payload)
          .eq("id", rowId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("homepage_featured_visuals")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) throw error;
        setRowId(data.id);
      }

      setMessage("Homepage visual update saved successfully.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to save homepage visual.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Homepage Visual Update
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Manage the right-side homepage flyer and match-day highlight block.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Use this for match-day flyers, player of the match announcements,
            result posters, or any important visual highlight.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          {loading ? (
            <div className="text-sm text-slate-500">Loading homepage visual...</div>
          ) : (
            <>
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

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="grid gap-4">
                  <Field
                    label="Eyebrow"
                    value={form.eyebrow}
                    onChange={(value) => setForm((prev) => ({ ...prev, eyebrow: value }))}
                  />

                  <Field
                    label="Title"
                    value={form.title}
                    onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
                  />

                  <Field
                    label="Subtitle"
                    value={form.subtitle}
                    onChange={(value) => setForm((prev) => ({ ...prev, subtitle: value }))}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Info 1 Label"
                      value={form.info_1_label}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, info_1_label: value }))
                      }
                    />
                    <Field
                      label="Info 1 Value"
                      value={form.info_1_value}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, info_1_value: value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Info 2 Label"
                      value={form.info_2_label}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, info_2_label: value }))
                      }
                    />
                    <Field
                      label="Info 2 Value"
                      value={form.info_2_value}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, info_2_value: value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Info 3 Label"
                      value={form.info_3_label}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, info_3_label: value }))
                      }
                    />
                    <Field
                      label="Info 3 Value"
                      value={form.info_3_value}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, info_3_value: value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Button Text"
                      value={form.button_text}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, button_text: value }))
                      }
                    />
                    <Field
                      label="Button Link"
                      value={form.button_link}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, button_link: value }))
                      }
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                      }
                    />
                    Active on homepage
                  </label>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Homepage Visual"}
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-lg font-bold text-slate-900">Image Upload & Preview</h2>

                  <div className="mt-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {uploading ? "Uploading image..." : "Upload poster/flyer directly from here."}
                  </p>

                  {previewUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img
                        src={previewUrl}
                        alt="Homepage visual preview"
                        className="w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                      No image uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
      />
    </div>
  );
}