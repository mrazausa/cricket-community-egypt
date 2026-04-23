"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type ProfileForm = {
  full_name: string;
  mobile_number: string;
  country: string;
  city: string;
  whatsapp_number: string;
};

const initialForm: ProfileForm = {
  full_name: "",
  mobile_number: "",
  country: "",
  city: "",
  whatsapp_number: "",
};

function getNextPath() {
  if (typeof window === "undefined") return "/dashboard";
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next && next.startsWith("/") ? next : "/dashboard";
}

export default function DashboardProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const nextPath = useMemo(() => getNextPath(), []);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        window.location.href = `/login?next=/dashboard/profile`;
        return;
      }

      const currentUserId = session.user.id;
      const currentEmail = session.user.email || "";

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle();

      if (!mounted) return;

      setUserId(currentUserId);
      setEmail(currentEmail);

      if (error) {
        console.error(error);
      }

      setForm({
        full_name: data?.full_name || "",
        mobile_number: data?.mobile_number || "",
        country: data?.country || "",
        city: data?.city || "",
        whatsapp_number: data?.whatsapp_number || "",
      });

      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function isProfileComplete(values: ProfileForm) {
    return Boolean(
      values.full_name.trim() &&
      values.mobile_number.trim() &&
      values.country.trim() &&
      values.city.trim() &&
      values.whatsapp_number.trim()
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const payload = {
        id: userId,
        email,
        full_name: form.full_name.trim() || null,
        mobile_number: form.mobile_number.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
        is_profile_complete: isProfileComplete(form),
      };

      const { error } = await supabase.from("profiles").upsert(payload);

      if (error) throw error;

      setMessage("Profile saved successfully.");

      setTimeout(() => {
        window.location.href = nextPath;
      }, 500);
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <SiteHeader />
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading profile...
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            My Dashboard
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Complete your profile
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Profile completion is required before submitting protected team or player registrations.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-7">
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

          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Enter full name"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Mobile Number
              </label>
              <input
                type="text"
                required
                value={form.mobile_number}
                onChange={(e) => updateField("mobile_number", e.target.value)}
                placeholder="Enter mobile number"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Country
              </label>
              <input
                type="text"
                required
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="Enter country"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                City
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Enter city"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                WhatsApp Number
              </label>
              <input
                type="text"
                required
                value={form.whatsapp_number}
                onChange={(e) => updateField("whatsapp_number", e.target.value)}
                placeholder="Enter WhatsApp number"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              <a
                href="/dashboard"
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Dashboard
              </a>
            </div>
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}