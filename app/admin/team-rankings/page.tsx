"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";

const MEDIA_BUCKET = "site-media";

type TeamInfo = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  badge: string | null;
};

type TeamRankingRow = {
  id: string;
  team_id: string | null;
  rank_position: number | null;
  points: number | null;
  matches: number | null;
  wins: number | null;
  losses: number | null;
  nrr: number | null;
  form: string | null;
  rating: number | null;
  season_label: string | null;
  team_name_override: string | null;
  team_logo_override_url: string | null;
  captain_name?: string | null;
  captain_photo_url?: string | null;
  is_active: boolean | null;
  show_on_homepage: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  teams?: TeamInfo | TeamInfo[] | null;
};

type EditableRow = {
  rank_position: string;
  points: string;
  matches: string;
  wins: string;
  losses: string;
  nrr: string;
  form: string;
  rating: string;
  season_label: string;
  team_name_override: string;
  team_logo_override_url: string;
  captain_name: string;
  captain_photo_url: string;
  is_active: boolean;
  show_on_homepage: boolean;
  sort_order: string;
};

const EMPTY_EDITABLE: EditableRow = {
  rank_position: "",
  points: "",
  matches: "",
  wins: "",
  losses: "",
  nrr: "",
  form: "",
  rating: "",
  season_label: "current",
  team_name_override: "",
  team_logo_override_url: "",
  captain_name: "",
  captain_photo_url: "",
  is_active: true,
  show_on_homepage: true,
  sort_order: "",
};

export default function AdminTeamRankingsPage() {
  const [rows, setRows] = useState<TeamRankingRow[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableRow>>({});
  const [newForm, setNewForm] = useState<EditableRow>({ ...EMPTY_EDITABLE });

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingNewLogo, setUploadingNewLogo] = useState(false);
  const [uploadingCaptainId, setUploadingCaptainId] = useState<string | null>(null);
  const [uploadingNewCaptain, setUploadingNewCaptain] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadRankings();
  }, []);

  async function loadRankings() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("team_rankings")
      .select(`
        id,
        team_id,
        rank_position,
        points,
        matches,
        wins,
        losses,
        nrr,
        form,
        rating,
        season_label,
        team_name_override,
        team_logo_override_url,
        captain_name,
        captain_photo_url,
        is_active,
        show_on_homepage,
        sort_order,
        created_at,
        updated_at,
        teams (
          id,
          name,
          slug,
          logo_url,
          badge
        )
      `)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("rank_position", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Failed to load team rankings:", error);
      setRows([]);
      setFormState({});
      setErrorText(error.message || "Failed to load team rankings.");
      setLoading(false);
      return;
    }

    const safeRows = (data || []) as TeamRankingRow[];
    setRows(safeRows);

    const nextFormState: Record<string, EditableRow> = {};
    for (const row of safeRows) nextFormState[row.id] = rowToEditable(row);
    setFormState(nextFormState);
    setLoading(false);
  }

  function rowToEditable(row: TeamRankingRow): EditableRow {
    return {
      rank_position: row.rank_position?.toString() ?? "",
      points: row.points?.toString() ?? "",
      matches: row.matches?.toString() ?? "",
      wins: row.wins?.toString() ?? "",
      losses: row.losses?.toString() ?? "",
      nrr: row.nrr?.toString() ?? "",
      form: row.form ?? "",
      rating: row.rating?.toString() ?? "",
      season_label: row.season_label ?? "current",
      team_name_override: row.team_name_override ?? "",
      team_logo_override_url: row.team_logo_override_url ?? "",
      captain_name: row.captain_name ?? "",
      captain_photo_url: row.captain_photo_url ?? "",
      is_active: row.is_active ?? true,
      show_on_homepage: row.show_on_homepage ?? true,
      sort_order: row.sort_order?.toString() ?? "",
    };
  }

  function getTeam(row: TeamRankingRow): TeamInfo | null {
    if (!row.teams) return null;
    if (Array.isArray(row.teams)) return row.teams[0] ?? null;
    return row.teams;
  }

  function getTeamImage(row: TeamRankingRow, form: EditableRow, team: TeamInfo | null) {
    return form.team_logo_override_url || row.team_logo_override_url || team?.logo_url || team?.badge || null;
  }

  function getDisplayName(row: TeamRankingRow, form: EditableRow, team: TeamInfo | null) {
    return form.team_name_override || row.team_name_override || team?.name || "Static Team";
  }

  function updateRowField(rowId: string, field: keyof EditableRow, value: string | boolean) {
    setFormState((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || EMPTY_EDITABLE), [field]: value },
    }));
  }

  function updateNewField(field: keyof EditableRow, value: string | boolean) {
    setNewForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadLogo(file: File, prefix: string) {
    const fileExt = (file.name.split(".").pop() || "png").toLowerCase();
    const filePath = `rankings/team/${prefix}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleTeamLogoUpload(rowId: string, file: File) {
    try {
      setUploadingId(rowId);
      setMessage("");
      setErrorText("");
      const publicUrl = await uploadLogo(file, `team-ranking-${rowId}`);
      updateRowField(rowId, "team_logo_override_url", publicUrl);
      setMessage("Team logo uploaded successfully. Click Save to apply.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to upload team logo.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleCaptainPhotoUpload(rowId: string, file: File) {
    try {
      setUploadingCaptainId(rowId);
      setMessage("");
      setErrorText("");
      const publicUrl = await uploadLogo(file, `team-captain-${rowId}`);
      updateRowField(rowId, "captain_photo_url", publicUrl);
      setMessage("Captain photo uploaded successfully. Click Save to apply.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to upload captain photo.");
    } finally {
      setUploadingCaptainId(null);
    }
  }

  async function handleNewCaptainPhotoUpload(file: File) {
    try {
      setUploadingNewCaptain(true);
      setMessage("");
      setErrorText("");
      const publicUrl = await uploadLogo(file, "team-captain-new");
      updateNewField("captain_photo_url", publicUrl);
      setMessage("Captain photo uploaded successfully. Create the ranking row to save it.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to upload captain photo.");
    } finally {
      setUploadingNewCaptain(false);
    }
  }

  async function handleNewLogoUpload(file: File) {
    try {
      setUploadingNewLogo(true);
      setMessage("");
      setErrorText("");
      const publicUrl = await uploadLogo(file, "team-ranking-new");
      updateNewField("team_logo_override_url", publicUrl);
      setMessage("Logo uploaded successfully. Create the ranking row to save it.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to upload team logo.");
    } finally {
      setUploadingNewLogo(false);
    }
  }

  function buildPayload(current: EditableRow) {
    return {
      rank_position: toNumberOrNull(current.rank_position),
      points: toNumberOrNull(current.points),
      matches: toNumberOrNull(current.matches),
      wins: toNumberOrNull(current.wins),
      losses: toNumberOrNull(current.losses),
      nrr: toNumberOrNull(current.nrr),
      form: toTextOrNull(current.form),
      rating: toNumberOrNull(current.rating),
      season_label: toTextOrNull(current.season_label),
      team_name_override: toTextOrNull(current.team_name_override),
      team_logo_override_url: toTextOrNull(current.team_logo_override_url),
      captain_name: toTextOrNull(current.captain_name),
      captain_photo_url: toTextOrNull(current.captain_photo_url),
      is_active: current.is_active,
      show_on_homepage: current.show_on_homepage,
      sort_order: toNumberOrNull(current.sort_order),
    };
  }

  function validatePayload(payload: ReturnType<typeof buildPayload>) {
    return [
      payload.rank_position,
      payload.points,
      payload.matches,
      payload.wins,
      payload.losses,
      payload.nrr,
      payload.rating,
      payload.sort_order,
    ].every((value) => value === null || !Number.isNaN(value));
  }

  async function saveRow(rowId: string) {
    const current = formState[rowId];
    if (!current) return;

    const payload = buildPayload(current);
    if (!validatePayload(payload)) {
      setErrorText("Please enter valid numeric values before saving.");
      return;
    }

    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("team_rankings").update(payload).eq("id", rowId);

    if (error) {
      console.error("Failed to update team ranking:", error);
      setErrorText(error.message || "Failed to update team ranking.");
      setSavingId(null);
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, ...payload, updated_at: new Date().toISOString() } : row
      )
    );

    setMessage("Team ranking updated successfully.");
    setSavingId(null);
  }

  async function createRanking() {
    const payload = buildPayload(newForm);

    if (!newForm.team_name_override.trim()) {
      setErrorText("Please enter a team display name for the static ranking row.");
      return;
    }

    if (!validatePayload(payload)) {
      setErrorText("Please enter valid numeric values before creating.");
      return;
    }

    setCreating(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("team_rankings").insert({
      team_id: null,
      ...payload,
    });

    if (error) {
      console.error("Failed to create team ranking:", error);
      setErrorText(error.message || "Failed to create team ranking.");
      setCreating(false);
      return;
    }

    setNewForm({ ...EMPTY_EDITABLE });
    setMessage("Static team ranking row created successfully.");
    setCreating(false);
    loadRankings();
  }

  async function deleteRow(rowId: string) {
    if (!window.confirm("Delete this team ranking row?")) return;

    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("team_rankings").delete().eq("id", rowId);

    if (error) {
      console.error("Failed to delete team ranking:", error);
      setErrorText(error.message || "Failed to delete team ranking.");
      setSavingId(null);
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setMessage("Team ranking row deleted.");
    setSavingId(null);
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aSort = a.sort_order ?? 999999;
      const bSort = b.sort_order ?? 999999;
      if (aSort !== bSort) return aSort - bSort;
      return (a.rank_position ?? 999999) - (b.rank_position ?? 999999);
    });
  }, [rows]);

  const activeCount = rows.filter((row) => row.is_active !== false).length;
  const homepageCount = sortedRows.filter((row) => row.show_on_homepage !== false && row.is_active !== false).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400/80">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Team Rankings Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Launch mode: edit static team rankings, upload logos, control active rows, and choose which teams appear on homepage.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/rankings"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              View Public Rankings
            </a>
            <button
              onClick={loadRankings}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total Rows" value={rows.length} />
          <SummaryCard label="Active Rows" value={activeCount} />
          <SummaryCard label="Homepage Top 5" value={`${Math.min(homepageCount, 5)} / 5`} />
        </div>

        {message ? <MessageBox type="success">{message}</MessageBox> : null}
        {errorText ? <MessageBox type="error">{errorText}</MessageBox> : null}

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Add Static Team</p>
              <h2 className="mt-1 text-xl font-bold">Create new ranking row</h2>
            </div>
            <button
              onClick={createRanking}
              disabled={creating}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Row"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextInput label="Team Display Name *" value={newForm.team_name_override} onChange={(value) => updateNewField("team_name_override", value)} placeholder="India Blue" />
            <TextInput label="Rank" value={newForm.rank_position} onChange={(value) => updateNewField("rank_position", value)} placeholder="1" />
            <TextInput label="Points" value={newForm.points} onChange={(value) => updateNewField("points", value)} placeholder="128" />
            <TextInput label="Matches" value={newForm.matches} onChange={(value) => updateNewField("matches", value)} placeholder="14" />
            <TextInput label="Wins" value={newForm.wins} onChange={(value) => updateNewField("wins", value)} placeholder="11" />
            <TextInput label="Losses" value={newForm.losses} onChange={(value) => updateNewField("losses", value)} placeholder="3" />
            <TextInput label="NRR" value={newForm.nrr} onChange={(value) => updateNewField("nrr", value)} placeholder="1.25" />
            <TextInput label="Rating" value={newForm.rating} onChange={(value) => updateNewField("rating", value)} placeholder="98" />
            <TextInput label="Form" value={newForm.form} onChange={(value) => updateNewField("form", value)} placeholder="W W W L W" />
            <TextInput label="Season" value={newForm.season_label} onChange={(value) => updateNewField("season_label", value)} placeholder="current" />
            <TextInput label="Sort Order" value={newForm.sort_order} onChange={(value) => updateNewField("sort_order", value)} placeholder="1" />
            <TextInput label="Captain Name" value={newForm.captain_name} onChange={(value) => updateNewField("captain_name", value)} placeholder="Captain name" />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Logo</label>
              <div className="flex items-center gap-3">
                {newForm.team_logo_override_url ? (
                  <img src={newForm.team_logo_override_url} alt="New team logo" className="h-11 w-11 rounded-full object-cover ring-1 ring-white/15" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/20">+</div>
                )}
                <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
                  {uploadingNewLogo ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleNewLogoUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Captain Photo</label>
              <div className="flex items-center gap-3">
                {newForm.captain_photo_url ? (
                  <img src={newForm.captain_photo_url} alt="Captain" className="h-11 w-11 rounded-full object-cover ring-1 ring-white/15" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/10 text-sm font-bold text-sky-300 ring-1 ring-sky-400/20">C</div>
                )}
                <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100">
                  {uploadingNewCaptain ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleNewCaptainPhotoUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Toggle label="Active" checked={newForm.is_active} onChange={(checked) => updateNewField("is_active", checked)} />
            <Toggle label="Show on Homepage" checked={newForm.show_on_homepage} onChange={(checked) => updateNewField("show_on_homepage", checked)} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 sm:p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Existing Rankings</p>
              <h2 className="mt-1 text-xl font-bold">Edit team ranking rows</h2>
            </div>
            <p className="text-sm text-slate-400">Homepage displays first 5 active homepage-enabled rows.</p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-10 text-center text-sm text-slate-300">Loading team rankings...</div>
          ) : sortedRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-10 text-center text-sm text-slate-300">No team rankings found. Create a static row above.</div>
          ) : (
            <div className="grid gap-4">
              {sortedRows.map((row) => {
                const team = getTeam(row);
                const form = formState[row.id] || EMPTY_EDITABLE;
                const displayName = getDisplayName(row, form, team);
                const image = getTeamImage(row, form, team);
                const captainPhoto = form.captain_photo_url || row.captain_photo_url || null;

                return (
                  <article key={row.id} className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 ring-1 ring-transparent transition hover:ring-emerald-400/20 sm:p-5">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        {image ? (
                          <img src={image} alt={displayName} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white/10" />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xl font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xl font-bold text-white">{displayName}</p>
                          <p className="mt-1 text-xs text-slate-400">Base team: {team?.name || "Static / not linked yet"}</p>
                          <p className="mt-1 text-xs text-slate-400">Captain: {form.captain_name || "TBA"}</p>
                          <p className="mt-1 break-all text-xs text-slate-500">Row ID: {row.id}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill active={form.is_active} label={form.is_active ? "Active" : "Hidden"} />
                        <StatusPill active={form.show_on_homepage} label={form.show_on_homepage ? "Homepage" : "Ranking only"} />
                        <button
                          onClick={() => saveRow(row.id)}
                          disabled={savingId === row.id}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === row.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => deleteRow(row.id)}
                          disabled={savingId === row.id}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-4 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <TextInput label="Display Team Name" value={form.team_name_override} onChange={(value) => updateRowField(row.id, "team_name_override", value)} placeholder={team?.name || "Team name"} />
                      <TextInput label="Rank" value={form.rank_position} onChange={(value) => updateRowField(row.id, "rank_position", value)} placeholder="1" />
                      <TextInput label="Points" value={form.points} onChange={(value) => updateRowField(row.id, "points", value)} placeholder="128" />
                      <TextInput label="Matches" value={form.matches} onChange={(value) => updateRowField(row.id, "matches", value)} placeholder="14" />
                      <TextInput label="Wins" value={form.wins} onChange={(value) => updateRowField(row.id, "wins", value)} placeholder="11" />
                      <TextInput label="Losses" value={form.losses} onChange={(value) => updateRowField(row.id, "losses", value)} placeholder="3" />
                      <TextInput label="NRR" value={form.nrr} onChange={(value) => updateRowField(row.id, "nrr", value)} placeholder="1.25" />
                      <TextInput label="Rating" value={form.rating} onChange={(value) => updateRowField(row.id, "rating", value)} placeholder="98" />
                      <TextInput label="Form" value={form.form} onChange={(value) => updateRowField(row.id, "form", value)} placeholder="W W W L W" />
                      <TextInput label="Season" value={form.season_label} onChange={(value) => updateRowField(row.id, "season_label", value)} placeholder="current" />
                      <TextInput label="Sort Order" value={form.sort_order} onChange={(value) => updateRowField(row.id, "sort_order", value)} placeholder="1" />
                      <TextInput label="Logo URL" value={form.team_logo_override_url} onChange={(value) => updateRowField(row.id, "team_logo_override_url", value)} placeholder="Auto-filled after upload" />
                      <TextInput label="Captain Name" value={form.captain_name} onChange={(value) => updateRowField(row.id, "captain_name", value)} placeholder="Captain name" />
                      <TextInput label="Captain Photo URL" value={form.captain_photo_url} onChange={(value) => updateRowField(row.id, "captain_photo_url", value)} placeholder="Auto-filled after upload" />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100">
                        {uploadingId === row.id ? "Uploading..." : "Upload Logo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleTeamLogoUpload(row.id, file);
                          }}
                        />
                      </label>

                      <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-sky-300/30 bg-sky-500/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-500/20">
                        {uploadingCaptainId === row.id ? "Uploading..." : "Upload Captain"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleCaptainPhotoUpload(row.id, file);
                          }}
                        />
                      </label>

                      <Toggle label="Active" checked={form.is_active} onChange={(checked) => updateRowField(row.id, "is_active", checked)} />
                      <Toggle label="Show on Homepage" checked={form.show_on_homepage} onChange={(checked) => updateRowField(row.id, "show_on_homepage", checked)} />

                      <p className="text-xs text-slate-500">Linked team logo remains available as fallback.</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return Number(trimmed);
}

function toTextOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70 focus:bg-white/10"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-emerald-500"
      />
      {label}
    </label>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-10 items-center rounded-xl px-3 text-xs font-bold ${
        active
          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
          : "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/10"
      }`}
    >
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MessageBox({
  type,
  children,
}: {
  type: "success" | "error";
  children: React.ReactNode;
}) {
  const isSuccess = type === "success";
  return (
    <div
      className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-red-500/20 bg-red-500/10 text-red-200"
      }`}
    >
      {children}
    </div>
  );
}
