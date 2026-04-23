"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";
import AdminNav from "@/components/admin/admin-nav";

type RegistrationTeamRow = {
  id: string;
  tournament: string | null;
  team_name: string;
  captain_name: string | null;
  manager_name: string | null;
  phone: string | null;
  email: string | null;
  city_base: string | null;
  squad_list: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

const TEAM_MEDIA_BUCKET = "site-media";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "png";
  return parts[parts.length - 1].toLowerCase();
}

export default function AdminTeamApprovalsPage() {
  const [teams, setTeams] = useState<RegistrationTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>(
    {}
  );
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  async function loadPendingTeams() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("registration_teams")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setTeams([]);
    } else {
      setTeams((data || []) as RegistrationTeamRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPendingTeams();

    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  function handleLogoSelect(registrationId: string, file: File | null) {
    if (previewUrls[registrationId]?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrls[registrationId]);
    }

    if (!file) {
      setSelectedFiles((prev) => ({ ...prev, [registrationId]: null }));
      setPreviewUrls((prev) => ({ ...prev, [registrationId]: "" }));
      return;
    }

    const localPreview = URL.createObjectURL(file);

    setSelectedFiles((prev) => ({ ...prev, [registrationId]: file }));
    setPreviewUrls((prev) => ({ ...prev, [registrationId]: localPreview }));
  }

  async function uploadTeamLogo(teamSlug: string, file: File) {
    const ext = getFileExtension(file.name);
    const filePath = `teams/${teamSlug}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(TEAM_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(TEAM_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function approveTeam(reg: RegistrationTeamRow) {
    try {
      setProcessingId(reg.id);
      setMessage("");
      setErrorMessage("");

      const baseSlug = slugify(reg.team_name);
      let finalSlug = baseSlug || `team-${Date.now()}`;

      const { data: existingSlugRows, error: slugCheckError } = await supabase
        .from("teams")
        .select("slug")
        .like("slug", `${baseSlug}%`);

      if (slugCheckError) throw slugCheckError;

      if ((existingSlugRows || []).length > 0) {
        finalSlug = `${baseSlug}-${(existingSlugRows || []).length + 1}`;
      }

      let logoUrl: string | null = null;
      const selectedLogo = selectedFiles[reg.id];

      if (selectedLogo) {
        logoUrl = await uploadTeamLogo(finalSlug, selectedLogo);
      }

      const { error: insertError } = await supabase.from("teams").insert([
        {
          name: reg.team_name,
          slug: finalSlug,
          badge: "Registered Team",
          captain: reg.captain_name || "TBA",
          base: reg.city_base || "Egypt",
          titles: "Newly Registered",
          overview:
            reg.notes?.trim() ||
            `${reg.team_name} joined the Cricket Community Egypt platform through team registration.`,
          is_featured: false,
          logo_url: logoUrl,
        },
      ]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("registration_teams")
        .update({ status: "approved" })
        .eq("id", reg.id);

      if (updateError) throw updateError;

      if (previewUrls[reg.id]?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrls[reg.id]);
      }

      setSelectedFiles((prev) => {
        const next = { ...prev };
        delete next[reg.id];
        return next;
      });

      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[reg.id];
        return next;
      });

      setMessage(
        `${reg.team_name} approved successfully${logoUrl ? " with logo uploaded." : "."}`
      );
      await loadPendingTeams();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to approve team.");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectTeam(id: string, name: string) {
    try {
      setProcessingId(id);
      setMessage("");
      setErrorMessage("");

      const { error } = await supabase
        .from("registration_teams")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      if (previewUrls[id]?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrls[id]);
      }

      setSelectedFiles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setMessage(`${name} registration marked as rejected.`);
      await loadPendingTeams();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to reject team.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold">Admin – Team Approvals</h1>
        <p className="mb-8 text-sm text-slate-600">
          Review pending team registrations, upload team logos directly, and convert
          them into official team profiles.
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
            Loading pending team registrations...
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            No pending team registrations found.
          </div>
        ) : (
          <div className="space-y-5">
            {teams.map((team) => {
              const previewUrl = previewUrls[team.id];
              const selectedFile = selectedFiles[team.id];

              return (
                <div
                  key={team.id}
                  className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4 flex-1">
                      <div>
                        <h2 className="text-xl font-bold">{team.team_name}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Tournament: {team.tournament || "N/A"}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">Captain:</span>{" "}
                          {team.captain_name || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Manager:</span>{" "}
                          {team.manager_name || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Phone:</span>{" "}
                          {team.phone || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Email:</span>{" "}
                          {team.email || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">City:</span>{" "}
                          {team.city_base || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Created:</span>{" "}
                          {new Date(team.created_at).toLocaleString()}
                        </p>
                      </div>

                      {team.notes ? (
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                          <span className="font-semibold text-slate-900">Notes:</span>{" "}
                          {team.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-base font-bold text-slate-900">
                        Team Logo Upload
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Upload directly here before approval.
                      </p>

                      <div className="mt-4 flex items-center gap-4">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={`${team.team_name} preview`}
                            className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200 text-lg font-bold text-slate-600">
                            {(team.team_name || "T").slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleLogoSelect(team.id, e.target.files?.[0] || null)
                            }
                            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                          />
                          <p className="mt-2 truncate text-xs text-slate-500">
                            {selectedFile ? selectedFile.name : "No logo selected"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() => approveTeam(team)}
                          disabled={processingId === team.id}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === team.id ? "Processing..." : "Approve Team"}
                        </button>

                        <button
                          onClick={() => rejectTeam(team.id, team.team_name)}
                          disabled={processingId === team.id}
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}