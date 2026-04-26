"use client";

import { useEffect, useMemo, useState } from "react";
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

type TeamRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
  badge?: string | null;
};

type TournamentTeamRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  sort_order: number | null;
  created_at?: string | null;
};

type PointsRow = {
  id: string;
  tournament_id: string;
  group_name: string | null;
  team_name: string | null;
  team_logo_url: string | null;
  matches_played: number | null;
  wins: number | null;
  losses: number | null;
  points: number | null;
  nrr: number | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type PointsForm = {
  group_name: string;
  team_name: string;
  team_logo_url: string;
  matches_played: string;
  wins: string;
  losses: string;
  points: string;
  nrr: string;
  sort_order: string;
  is_active: boolean;
};

const emptyPointsForm: PointsForm = {
  group_name: "Group A",
  team_name: "",
  team_logo_url: "",
  matches_played: "0",
  wins: "0",
  losses: "0",
  points: "0",
  nrr: "0",
  sort_order: "999",
  is_active: true,
};


type StaticTeamForm = {
  name: string;
  slug: string;
  badge: string;
  logo_url: string;
  group_name: string;
  sort_order: string;
};

const emptyStaticTeamForm: StaticTeamForm = {
  name: "",
  slug: "",
  badge: "",
  logo_url: "",
  group_name: "Group A",
  sort_order: "999",
};

const TEAM_LOGO_BUCKET = "team-logos";
const MEDIA_BUCKET = "site-media";

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

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


export default function AdminTournamentTeamsPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [links, setLinks] = useState<TournamentTeamRow[]>([]);
  const [pointsRows, setPointsRows] = useState<PointsRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [staticTeamForm, setStaticTeamForm] = useState<StaticTeamForm>(emptyStaticTeamForm);
  const [creatingStaticTeam, setCreatingStaticTeam] = useState(false);
  const [uploadingStaticTeamLogo, setUploadingStaticTeamLogo] = useState(false);

  const [pointsForm, setPointsForm] = useState<PointsForm>(emptyPointsForm);
  const [editingPointsId, setEditingPointsId] = useState<string | null>(null);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [processingTeamId, setProcessingTeamId] = useState<string | null>(null);
  const [savingPoints, setSavingPoints] = useState(false);
  const [deletingPointsId, setDeletingPointsId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentTeams(selectedTournamentId);
      loadPointsTable(selectedTournamentId);
      setPointsForm((prev) => ({ ...prev, group_name: prev.group_name || "Group A" }));
    } else {
      setLinks([]);
      setPointsRows([]);
      setLoadingLinks(false);
      setLoadingPoints(false);
    }
  }, [selectedTournamentId]);

  async function loadSetup() {
    setLoadingSetup(true);
    setMessage("");
    setMessageType("");

    const [tournamentsRes, teamsRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, title, slug, status")
        .order("created_at", { ascending: false }),
      supabase
        .from("teams")
        .select("id, name, slug, logo_url, badge")
        .order("name", { ascending: true }),
    ]);

    if (tournamentsRes.error || teamsRes.error) {
      const error = tournamentsRes.error || teamsRes.error;
      setMessage(`Failed to load setup data. ${formatError(error)}`);
      setMessageType("error");
      setLoadingSetup(false);
      return;
    }

    const tournamentRows = (tournamentsRes.data || []) as TournamentRow[];
    setTournaments(tournamentRows);
    setTeams((teamsRes.data || []) as TeamRow[]);

    if (tournamentRows.length > 0) {
      setSelectedTournamentId((prev) => prev || tournamentRows[0].id);
    }

    setLoadingSetup(false);
  }

  async function loadTournamentTeams(tournamentId: string) {
    setLoadingLinks(true);

    const { data, error } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id, team_id, sort_order, created_at")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setLinks([]);
      setMessage(`Failed to load tournament teams. ${formatError(error)}`);
      setMessageType("error");
      setLoadingLinks(false);
      return;
    }

    setLinks((data || []) as TournamentTeamRow[]);
    setLoadingLinks(false);
  }

  async function loadPointsTable(tournamentId: string) {
    setLoadingPoints(true);

    const { data, error } = await supabase
      .from("tournament_points_table")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("group_name", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      setPointsRows([]);
      setMessage(`Failed to load points table. ${formatError(error)}`);
      setMessageType("error");
      setLoadingPoints(false);
      return;
    }

    setPointsRows((data || []) as PointsRow[]);
    setLoadingPoints(false);
  }


  async function uploadStaticTeamLogo(file: File) {
    try {
      setUploadingStaticTeamLogo(true);
      setMessage("");
      setMessageType("");

      const ext = file.name.split(".").pop() || "png";
      const safeName = slugify(staticTeamForm.name || "team-logo") || "team-logo";
      const filePath = `static-teams/${safeName}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(TEAM_LOGO_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(TEAM_LOGO_BUCKET).getPublicUrl(filePath);
      setStaticTeamForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
      setMessage("Team logo uploaded. Click Create & Link Team to save.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to upload team logo. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setUploadingStaticTeamLogo(false);
    }
  }

  async function createStaticTeamAndLink() {
    if (!selectedTournamentId) {
      setMessage("Please select a tournament first.");
      setMessageType("error");
      return;
    }

    if (!staticTeamForm.name.trim()) {
      setMessage("Please enter a team name.");
      setMessageType("error");
      return;
    }

    setCreatingStaticTeam(true);
    setMessage("");
    setMessageType("");

    try {
      const finalSlug = slugify(staticTeamForm.slug || staticTeamForm.name);
      const nextSortOrder =
        staticTeamForm.sort_order.trim() !== ""
          ? toNumber(staticTeamForm.sort_order, 999)
          : links.length > 0
            ? Math.max(...links.map((item) => item.sort_order ?? 0)) + 1
            : 1;

      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: staticTeamForm.name.trim(),
          slug: finalSlug,
          badge: staticTeamForm.badge.trim() || null,
          logo_url: staticTeamForm.logo_url.trim() || null,
        })
        .select("id, name, slug, logo_url, badge")
        .single();

      if (teamError) throw teamError;

      const createdTeam = newTeam as TeamRow;

      const { error: linkError } = await supabase.from("tournament_teams").insert({
        tournament_id: selectedTournamentId,
        team_id: createdTeam.id,
        sort_order: nextSortOrder,
      });

      if (linkError) throw linkError;

      await supabase.from("tournament_points_table").insert({
        tournament_id: selectedTournamentId,
        group_name: staticTeamForm.group_name.trim() || "Group A",
        team_name: createdTeam.name || staticTeamForm.name.trim(),
        team_logo_url: createdTeam.logo_url || null,
        matches_played: 0,
        wins: 0,
        losses: 0,
        points: 0,
        nrr: 0,
        sort_order: nextSortOrder,
        is_active: true,
      });

      setStaticTeamForm(emptyStaticTeamForm);
      setMessage("Static team created, linked, and points row prepared.");
      setMessageType("success");

      await Promise.all([
        loadSetup(),
        loadTournamentTeams(selectedTournamentId),
        loadPointsTable(selectedTournamentId),
      ]);
    } catch (error) {
      setMessage(`Failed to create static team. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setCreatingStaticTeam(false);
    }
  }

  async function addTeamToTournament(teamId: string) {
    if (!selectedTournamentId) {
      setMessage("Please select a tournament first.");
      setMessageType("error");
      return;
    }

    setProcessingTeamId(teamId);
    setMessage("");
    setMessageType("");

    try {
      const alreadyLinked = links.some((item) => item.team_id === teamId);
      if (alreadyLinked) {
        setMessage("This team is already linked to the selected tournament.");
        setMessageType("error");
        setProcessingTeamId(null);
        return;
      }

      const nextSortOrder =
        links.length > 0
          ? Math.max(...links.map((item) => item.sort_order ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("tournament_teams").insert({
        tournament_id: selectedTournamentId,
        team_id: teamId,
        sort_order: nextSortOrder,
      });

      if (error) throw error;

      const team = teams.find((item) => item.id === teamId);
      if (team) {
        const nextPointsOrder =
          pointsRows.length > 0
            ? Math.max(...pointsRows.map((item) => item.sort_order ?? 0)) + 1
            : 1;

        await supabase.from("tournament_points_table").insert({
          tournament_id: selectedTournamentId,
          group_name: "Group A",
          team_name: team.name || "Unnamed Team",
          team_logo_url: team.logo_url || null,
          matches_played: 0,
          wins: 0,
          losses: 0,
          points: 0,
          nrr: 0,
          sort_order: nextPointsOrder,
          is_active: true,
        });
      }

      setMessage("Team linked successfully. A points table row was also prepared.");
      setMessageType("success");
      await Promise.all([
        loadTournamentTeams(selectedTournamentId),
        loadPointsTable(selectedTournamentId),
      ]);
    } catch (error) {
      setMessage(`Failed to link team. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setProcessingTeamId(null);
    }
  }
async function deleteTeamPermanently(teamId: string, teamName?: string | null) {
  const ok = window.confirm(
    `Delete "${teamName || "this team"}" permanently from master teams list?`
  );

  if (!ok) return;

  setProcessingTeamId(teamId);
  setMessage("");
  setMessageType("");

  try {
    const isLinkedAnywhere = links.some((item) => item.team_id === teamId);

    if (isLinkedAnywhere) {
      setMessage("This team is linked to the selected tournament. Remove it first, then delete.");
      setMessageType("error");
      return;
    }

    const { error } = await supabase.from("teams").delete().eq("id", teamId);

    if (error) throw error;

    setTeams((prev) => prev.filter((team) => team.id !== teamId));
    setMessage("Team deleted permanently.");
    setMessageType("success");
  } catch (error) {
    setMessage(`Failed to delete team. ${formatError(error)}`);
    setMessageType("error");
  } finally {
    setProcessingTeamId(null);
  }
}
  async function removeTeamFromTournament(linkId: string) {
    const ok = window.confirm("Remove this team from the selected tournament?");
    if (!ok) return;

    setProcessingTeamId(linkId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase
        .from("tournament_teams")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setMessage("Team removed from tournament successfully.");
      setMessageType("success");
      await loadTournamentTeams(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to remove team. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setProcessingTeamId(null);
    }
  }

  async function updateSortOrder(linkId: string, value: number) {
    try {
      const { error } = await supabase
        .from("tournament_teams")
        .update({ sort_order: value })
        .eq("id", linkId);

      if (error) throw error;

      setLinks((prev) =>
        prev.map((item) =>
          item.id === linkId ? { ...item, sort_order: value } : item
        )
      );
    } catch (error) {
      setMessage(`Failed to update sort order. ${formatError(error)}`);
      setMessageType("error");
    }
  }

  function editPointsRow(row: PointsRow) {
    setEditingPointsId(row.id);
    setPointsForm({
      group_name: row.group_name || "Group A",
      team_name: row.team_name || "",
      team_logo_url: row.team_logo_url || "",
      matches_played: String(row.matches_played ?? 0),
      wins: String(row.wins ?? 0),
      losses: String(row.losses ?? 0),
      points: String(row.points ?? 0),
      nrr: String(row.nrr ?? 0),
      sort_order: String(row.sort_order ?? 999),
      is_active: row.is_active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetPointsForm() {
    setEditingPointsId(null);
    setPointsForm(emptyPointsForm);
  }

  async function uploadTeamLogo(file: File) {
    try {
      setUploadingLogo(true);
      setMessage("");
      setMessageType("");

      const ext = file.name.split(".").pop() || "png";
      const fileName = `tournament-points-${Date.now()}.${ext}`;
      const filePath = `tournament-points/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);

      setPointsForm((prev) => ({ ...prev, team_logo_url: data.publicUrl }));
      setMessage("Logo uploaded. Click Save Points Row to apply.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to upload logo. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function savePointsRow() {
    if (!selectedTournamentId) {
      setMessage("Please select a tournament first.");
      setMessageType("error");
      return;
    }

    if (!pointsForm.team_name.trim()) {
      setMessage("Please enter team name for points table.");
      setMessageType("error");
      return;
    }

    setSavingPoints(true);
    setMessage("");
    setMessageType("");

    const payload = {
      tournament_id: selectedTournamentId,
      group_name: pointsForm.group_name.trim() || "Group A",
      team_name: pointsForm.team_name.trim(),
      team_logo_url: pointsForm.team_logo_url.trim() || null,
      matches_played: toNumber(pointsForm.matches_played),
      wins: toNumber(pointsForm.wins),
      losses: toNumber(pointsForm.losses),
      points: toNumber(pointsForm.points),
      nrr: toNumber(pointsForm.nrr),
      sort_order: toNumber(pointsForm.sort_order, 999),
      is_active: !!pointsForm.is_active,
    };

    try {
      if (editingPointsId) {
        const { error } = await supabase
          .from("tournament_points_table")
          .update(payload)
          .eq("id", editingPointsId);
        if (error) throw error;
        setMessage("Points table row updated successfully.");
      } else {
        const { error } = await supabase.from("tournament_points_table").insert(payload);
        if (error) throw error;
        setMessage("Points table row created successfully.");
      }

      setMessageType("success");
      resetPointsForm();
      await loadPointsTable(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to save points table row. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSavingPoints(false);
    }
  }

  async function deletePointsRow(rowId: string) {
    const ok = window.confirm("Delete this points table row?");
    if (!ok) return;

    setDeletingPointsId(rowId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase
        .from("tournament_points_table")
        .delete()
        .eq("id", rowId);

      if (error) throw error;

      setMessage("Points table row deleted successfully.");
      setMessageType("success");
      await loadPointsTable(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to delete points row. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setDeletingPointsId(null);
    }
  }

  const linkedTeamIds = useMemo(() => {
    return new Set(links.map((item) => item.team_id));
  }, [links]);

  const linkedTeams = useMemo(() => {
    return links
      .map((link) => {
        const team = teams.find((item) => item.id === link.team_id);
        return { link, team };
      })
      .filter((item) => item.team);
  }, [links, teams]);

  const availableTeams = useMemo(() => {
    return teams.filter((team) => !linkedTeamIds.has(team.id));
  }, [teams, linkedTeamIds]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Tournament Teams & Points Table
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Link teams and control tournament standings from one place.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            For launch, standings are static/admin-controlled. Later they can be generated automatically from match scorecards.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Tournament
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                disabled={loadingSetup}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">Select tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title || "Untitled Tournament"}
                  </option>
                ))}
              </select>
            </div>

            <SummaryBox label="Linked Teams" value={linkedTeams.length} />
            <SummaryBox label="Points Rows" value={pointsRows.length} />
          </div>

          {message ? (
            <div
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                messageType === "error"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>
      </section>


      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <AdminCard eyebrow="Static Team" title="Create & Link Static Team">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Team Name"
              value={staticTeamForm.name}
              onChange={(value) =>
                setStaticTeamForm((p) => ({
                  ...p,
                  name: value,
                  slug: p.slug || slugify(value),
                }))
              }
              placeholder="India Blue"
            />
            <Field
              label="Slug"
              value={staticTeamForm.slug}
              onChange={(value) => setStaticTeamForm((p) => ({ ...p, slug: slugify(value) }))}
              placeholder="india-blue"
            />
            <Field
              label="Group"
              value={staticTeamForm.group_name}
              onChange={(value) => setStaticTeamForm((p) => ({ ...p, group_name: value }))}
              placeholder="Group A"
            />
            <Field
              label="Badge / Short Code"
              value={staticTeamForm.badge}
              onChange={(value) => setStaticTeamForm((p) => ({ ...p, badge: value }))}
              placeholder="IB"
            />
            <Field
              label="Sort Order"
              type="number"
              value={staticTeamForm.sort_order}
              onChange={(value) => setStaticTeamForm((p) => ({ ...p, sort_order: value }))}
              placeholder="1"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Logo</label>
              <div className="flex flex-wrap items-center gap-3">
                {staticTeamForm.logo_url ? (
                  <img
                    src={staticTeamForm.logo_url}
                    alt="Team logo preview"
                    className="h-12 w-12 rounded-full border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    LOGO
                  </div>
                )}
                <label className="cursor-pointer rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  {uploadingStaticTeamLogo ? "Uploading..." : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingStaticTeamLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadStaticTeamLogo(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createStaticTeamAndLink}
              disabled={creatingStaticTeam || !selectedTournamentId}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingStaticTeam ? "Creating..." : "Create & Link Team"}
            </button>
            <button
              type="button"
              onClick={() => setStaticTeamForm(emptyStaticTeamForm)}
              className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </AdminCard>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <AdminCard eyebrow="Available Teams" title="Add Teams to Tournament">
          {!selectedTournamentId ? (
            <EmptyBox text="Select a tournament first." />
          ) : loadingSetup || loadingLinks ? (
            <EmptyBox text="Loading available teams..." />
          ) : availableTeams.length === 0 ? (
            <EmptyBox text="No more teams available to add." />
          ) : (
            <div className="space-y-4">
              {availableTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <TeamMini team={team} />
                  <div className="flex shrink-0 items-center gap-2">
  <button
    type="button"
    onClick={() => addTeamToTournament(team.id)}
    disabled={processingTeamId === team.id}
    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {processingTeamId === team.id ? "Adding..." : "Add"}
  </button>

  <button
    type="button"
    onClick={() => deleteTeamPermanently(team.id, team.name)}
    disabled={processingTeamId === team.id}
    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
  >
    Delete
  </button>
</div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard eyebrow="Linked Teams" title="Manage Tournament Teams">
          {!selectedTournamentId ? (
            <EmptyBox text="Select a tournament first." />
          ) : loadingLinks ? (
            <EmptyBox text="Loading linked teams..." />
          ) : linkedTeams.length === 0 ? (
            <EmptyBox text="No teams linked yet for this tournament." />
          ) : (
            <div className="space-y-4">
              {linkedTeams.map(({ link, team }) => (
                <div key={link.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <TeamMini team={team || null} />

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Sort
                        </label>
                        <input
                          type="number"
                          value={link.sort_order ?? 0}
                          onChange={(e) =>
                            updateSortOrder(link.id, Number(e.target.value) || 0)
                          }
                          className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTeamFromTournament(link.id)}
                        disabled={processingTeamId === link.id}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingTeamId === link.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <AdminCard
            eyebrow="Points Table"
            title={editingPointsId ? "Edit Standings Row" : "Create Standings Row"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Group"
                value={pointsForm.group_name}
                onChange={(value) => setPointsForm((p) => ({ ...p, group_name: value }))}
                placeholder="Group A"
              />
              <Field
                label="Team Name"
                value={pointsForm.team_name}
                onChange={(value) => setPointsForm((p) => ({ ...p, team_name: value }))}
                placeholder="India Blue"
              />
              <Field
                label="Team Logo URL"
                value={pointsForm.team_logo_url}
                onChange={(value) => setPointsForm((p) => ({ ...p, team_logo_url: value }))}
                placeholder="https://..."
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Upload Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadTeamLogo(file);
                  }}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {uploadingLogo ? "Uploading..." : "Optional"}
                </p>
              </div>
              <Field label="Played" type="number" value={pointsForm.matches_played} onChange={(value) => setPointsForm((p) => ({ ...p, matches_played: value }))} />
              <Field label="Wins" type="number" value={pointsForm.wins} onChange={(value) => setPointsForm((p) => ({ ...p, wins: value }))} />
              <Field label="Losses" type="number" value={pointsForm.losses} onChange={(value) => setPointsForm((p) => ({ ...p, losses: value }))} />
              <Field label="Points" type="number" value={pointsForm.points} onChange={(value) => setPointsForm((p) => ({ ...p, points: value }))} />
              <Field label="NRR" type="number" value={pointsForm.nrr} onChange={(value) => setPointsForm((p) => ({ ...p, nrr: value }))} />
              <Field label="Sort Order" type="number" value={pointsForm.sort_order} onChange={(value) => setPointsForm((p) => ({ ...p, sort_order: value }))} />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={pointsForm.is_active}
                  onChange={(e) => setPointsForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Active / Show on tournament page
              </label>
            </div>

            {pointsForm.team_logo_url ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <img
                  src={pointsForm.team_logo_url}
                  alt="Team logo preview"
                  className="h-12 w-12 rounded-full object-contain bg-white p-1 ring-1 ring-slate-200"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Logo Preview</p>
                  <p className="text-xs text-slate-500">This logo will appear on the public points table.</p>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={savePointsRow}
                disabled={savingPoints}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingPoints ? "Saving..." : editingPointsId ? "Update Points Row" : "Create Points Row"}
              </button>
              <button
                type="button"
                onClick={resetPointsForm}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </AdminCard>

          <AdminCard eyebrow="Current Table" title="Tournament Standings Rows">
            {loadingPoints ? (
              <EmptyBox text="Loading points table..." />
            ) : pointsRows.length === 0 ? (
              <EmptyBox text="No points table rows yet. Create one using the form." />
            ) : (
              <div className="space-y-3">
                {pointsRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      {row.team_logo_url ? (
                        <img
                          src={row.team_logo_url}
                          alt={row.team_name || "Team"}
                          className="h-12 w-12 rounded-full object-contain bg-white p-1 ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {(row.team_name || "T").charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {row.team_name || "Unnamed Team"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-emerald-700">
                              {row.group_name || "Group"} · Sort {row.sort_order ?? 999}
                            </p>
                          </div>

                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                            {row.is_active === false ? "Hidden" : "Active"}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                          <MiniStat label="P" value={row.matches_played ?? 0} />
                          <MiniStat label="W" value={row.wins ?? 0} />
                          <MiniStat label="L" value={row.losses ?? 0} />
                          <MiniStat label="Pts" value={row.points ?? 0} />
                          <MiniStat label="NRR" value={row.nrr ?? 0} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editPointsRow(row)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePointsRow(row.id)}
                            disabled={deletingPointsId === row.id}
                            className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingPointsId === row.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function AdminCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TeamMini({ team }: { team: TeamRow | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {team?.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name || "Team"}
          className="h-11 w-11 rounded-full object-contain bg-white p-1 ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {(team?.name || "T").charAt(0)}
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">
          {team?.name || "Unnamed Team"}
        </p>
        <p className="truncate text-sm text-slate-500">
          {team?.badge || team?.slug || "Tournament Team"}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
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
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}
