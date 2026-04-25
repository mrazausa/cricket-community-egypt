"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";

const MEDIA_BUCKET = "site-media";

const PLAYER_AWARD_CATEGORIES = [
  "Best Player / MVP",
  "Best Batsman",
  "Best Bowler",
  "Best All Rounder",
  "Best Wicket Keeper",
  "Best Fielder",
  "Best Captain",
  "Emerging Player",
  "Player of the Match Race",
];

const BADGE_COLORS = ["gold", "emerald", "blue", "purple", "rose", "slate"];

type PlayerInfo = {
  id?: string | null;
  name?: string | null;
  full_name?: string | null;
  player_name?: string | null;
  display_name?: string | null;
  slug?: string | null;
  player_code?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  [key: string]: any;
};

type PlayerRankingRow = {
  id: string;
  player_id: string | null;
  rank_position: number | null;
  category: string | null;
  award_category: string | null;
  badge_color: string | null;
  player_display_name: string | null;
  player_photo_url: string | null;
  team_display_name: string | null;
  matches: number | null;
  runs: number | null;
  wickets: number | null;
  average: number | null;
  strike_rate: number | null;
  economy: number | null;
  rating: number | null;
  stat_value: string | null;
  season: string | null;
  season_label: string | null;
  is_active: boolean | null;
  show_on_homepage: boolean | null;
  sort_order: number | null;
  player_name_override: string | null;
  player_photo_override_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  players?: PlayerInfo | PlayerInfo[] | null;
};

type EditableRow = {
  rank_position: string;
  award_category: string;
  badge_color: string;
  player_display_name: string;
  team_display_name: string;
  matches: string;
  runs: string;
  wickets: string;
  average: string;
  strike_rate: string;
  economy: string;
  rating: string;
  stat_value: string;
  season: string;
  season_label: string;
  sort_order: string;
  player_photo_url: string;
  is_active: boolean;
  show_on_homepage: boolean;
};

const EMPTY_EDITABLE: EditableRow = {
  rank_position: "",
  award_category: "Best Player / MVP",
  badge_color: "gold",
  player_display_name: "",
  team_display_name: "",
  matches: "0",
  runs: "0",
  wickets: "0",
  average: "0",
  strike_rate: "0",
  economy: "0",
  rating: "0",
  stat_value: "",
  season: "current",
  season_label: "current",
  sort_order: "999",
  player_photo_url: "",
  is_active: true,
  show_on_homepage: true,
};

export default function AdminPlayerRankingsPage() {
  const [rows, setRows] = useState<PlayerRankingRow[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableRow>>({});
  const [newRow, setNewRow] = useState<EditableRow>({
    ...EMPTY_EDITABLE,
    sort_order: "1",
    rating: "100",
  });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      .from("player_rankings")
      .select(
        `
          id,
          player_id,
          rank_position,
          category,
          award_category,
          badge_color,
          player_display_name,
          player_photo_url,
          team_display_name,
          matches,
          runs,
          wickets,
          average,
          strike_rate,
          economy,
          rating,
          stat_value,
          season,
          season_label,
          is_active,
          show_on_homepage,
          sort_order,
          player_name_override,
          player_photo_override_url,
          created_at,
          updated_at,
          players (*)
        `
      )
      .order("sort_order", { ascending: true })
      .order("rank_position", { ascending: true });

    if (error) {
      console.error("Failed to load player rankings:", error);
      setRows([]);
      setFormState({});
      setErrorText(error.message || "Failed to load player rankings.");
      setLoading(false);
      return;
    }

    const safeRows = (data || []) as PlayerRankingRow[];
    setRows(safeRows);

    const nextFormState: Record<string, EditableRow> = {};
    for (const row of safeRows) {
      nextFormState[row.id] = rowToEditable(row);
    }

    setFormState(nextFormState);
    setLoading(false);
  }

  function rowToEditable(row: PlayerRankingRow): EditableRow {
    const player = getPlayer(row);
    const fallbackName = getPlayerNameFromSource(player);

    return {
      rank_position: row.rank_position?.toString() ?? "",
      award_category:
        row.award_category || row.category || EMPTY_EDITABLE.award_category,
      badge_color: row.badge_color || EMPTY_EDITABLE.badge_color,
      player_display_name:
        row.player_display_name ||
        row.player_name_override ||
        fallbackName ||
        "",
      team_display_name: row.team_display_name || "",
      matches: row.matches?.toString() ?? "0",
      runs: row.runs?.toString() ?? "0",
      wickets: row.wickets?.toString() ?? "0",
      average: row.average?.toString() ?? "0",
      strike_rate: row.strike_rate?.toString() ?? "0",
      economy: row.economy?.toString() ?? "0",
      rating: row.rating?.toString() ?? "0",
      stat_value: row.stat_value ?? "",
      season: row.season || row.season_label || "current",
      season_label: row.season_label || row.season || "current",
      sort_order: row.sort_order?.toString() ?? "999",
      player_photo_url:
        row.player_photo_url ||
        row.player_photo_override_url ||
        getPlayerImageFromSource(player) ||
        "",
      is_active: row.is_active !== false,
      show_on_homepage: row.show_on_homepage !== false,
    };
  }

  function getPlayer(row: PlayerRankingRow): PlayerInfo | null {
    if (!row.players) return null;
    if (Array.isArray(row.players)) return row.players[0] ?? null;
    return row.players;
  }

  function getPlayerNameFromSource(player: PlayerInfo | null) {
    if (!player) return "";
    return (
      player.full_name ||
      player.name ||
      player.player_name ||
      player.display_name ||
      ""
    );
  }

  function getPlayerImageFromSource(player: PlayerInfo | null) {
    if (!player) return "";
    return (
      player.image_url ||
      player.photo_url ||
      player.avatar_url ||
      player.profile_image_url ||
      ""
    );
  }

  function getPlayerCode(player: PlayerInfo | null) {
    if (!player) return "";
    return player.player_code || "";
  }

  function getDisplayName(row: PlayerRankingRow) {
    const player = getPlayer(row);
    return (
      row.player_display_name ||
      row.player_name_override ||
      getPlayerNameFromSource(player) ||
      "Unnamed Player"
    );
  }

  function getDisplayPhoto(row: PlayerRankingRow) {
    const player = getPlayer(row);
    return (
      row.player_photo_url ||
      row.player_photo_override_url ||
      getPlayerImageFromSource(player) ||
      ""
    );
  }

  function handleChange(
    rowId: string,
    field: keyof EditableRow,
    value: string | boolean
  ) {
    setFormState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || EMPTY_EDITABLE),
        [field]: value,
      },
    }));
  }

  function handleNewChange(field: keyof EditableRow, value: string | boolean) {
    setNewRow((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function uploadImage(file: File, scope: string) {
    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${scope}-${Date.now()}.${fileExt}`;
    const filePath = `rankings/player/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handlePlayerPhotoUpload(rowId: string, file: File) {
    try {
      setMessage("");
      setErrorText("");

      const publicUrl = await uploadImage(file, `player-ranking-${rowId}`);

      setFormState((prev) => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] || EMPTY_EDITABLE),
          player_photo_url: publicUrl,
        },
      }));

      setMessage("Player photo uploaded successfully. Click Save to apply.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to upload player photo.");
    }
  }

  async function handleNewPhotoUpload(file: File) {
    try {
      setMessage("");
      setErrorText("");

      const publicUrl = await uploadImage(file, "player-ranking-new");

      setNewRow((prev) => ({
        ...prev,
        player_photo_url: publicUrl,
      }));

      setMessage("Player photo uploaded successfully. Click Create Row to apply.");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to upload player photo.");
    }
  }

  function buildPayload(current: EditableRow) {
    const payload = {
      rank_position: toNullableNumber(current.rank_position),
      category: current.award_category.trim() || null,
      award_category: current.award_category.trim() || null,
      badge_color: current.badge_color.trim() || "gold",
      player_display_name: current.player_display_name.trim() || null,
      player_name_override: current.player_display_name.trim() || null,
      player_photo_url: current.player_photo_url.trim() || null,
      player_photo_override_url: current.player_photo_url.trim() || null,
      team_display_name: current.team_display_name.trim() || null,
      matches: toNullableNumber(current.matches),
      runs: toNullableNumber(current.runs),
      wickets: toNullableNumber(current.wickets),
      average: toNullableNumber(current.average),
      strike_rate: toNullableNumber(current.strike_rate),
      economy: toNullableNumber(current.economy),
      rating: toNullableNumber(current.rating),
      stat_value: current.stat_value.trim() || null,
      season: current.season.trim() || "current",
      season_label: current.season_label.trim() || current.season.trim() || "current",
      sort_order: toNullableNumber(current.sort_order) ?? 999,
      is_active: current.is_active,
      show_on_homepage: current.show_on_homepage,
    };

    return payload;
  }

  function validatePayload(payload: ReturnType<typeof buildPayload>) {
    const numericFields = [
      "rank_position",
      "matches",
      "runs",
      "wickets",
      "average",
      "strike_rate",
      "economy",
      "rating",
      "sort_order",
    ] as const;

    for (const field of numericFields) {
      if (payload[field] !== null && Number.isNaN(payload[field])) {
        return `Please enter a valid number for ${field.replace(/_/g, " ")}.`;
      }
    }

    if (!payload.player_display_name) {
      return "Player display name is required.";
    }

    return "";
  }

  async function saveRow(rowId: string) {
    const current = formState[rowId];
    if (!current) return;

    const payload = buildPayload(current);
    const validationError = validatePayload(payload);

    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("player_rankings")
      .update(payload)
      .eq("id", rowId);

    if (error) {
      console.error("Failed to update player ranking:", error);
      setErrorText(error.message || "Failed to update player ranking.");
      setSavingId(null);
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...payload,
              updated_at: new Date().toISOString(),
            }
          : row
      )
    );

    setMessage("Player ranking updated successfully.");
    setSavingId(null);
  }

  async function createRow() {
    const payload = buildPayload(newRow);
    const validationError = validatePayload(payload);

    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setCreating(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("player_rankings").insert(payload);

    if (error) {
      console.error("Failed to create player ranking:", error);
      setErrorText(error.message || "Failed to create player ranking.");
      setCreating(false);
      return;
    }

    setNewRow({
      ...EMPTY_EDITABLE,
      rank_position: "",
      rating: "100",
      sort_order: "1",
    });
    setMessage("Player ranking row created successfully.");
    setCreating(false);
    await loadRankings();
  }

  async function deleteRow(rowId: string) {
    const confirmed = window.confirm(
      "Delete this player ranking row? This will remove it from homepage and rankings display."
    );
    if (!confirmed) return;

    setDeletingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("player_rankings")
      .delete()
      .eq("id", rowId);

    if (error) {
      console.error("Failed to delete player ranking:", error);
      setErrorText(error.message || "Failed to delete player ranking.");
      setDeletingId(null);
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setDeletingId(null);
    setMessage("Player ranking row deleted.");
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aSort = a.sort_order ?? 999999;
      const bSort = b.sort_order ?? 999999;
      if (aSort !== bSort) return aSort - bSort;

      const aPos = a.rank_position ?? 999999;
      const bPos = b.rank_position ?? 999999;
      return aPos - bPos;
    });
  }, [rows]);

  const activeCount = rows.filter((row) => row.is_active !== false).length;
  const homeCount = rows.filter(
    (row) => row.is_active !== false && row.show_on_homepage !== false
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400/80">
              Admin Panel
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Player Rankings & Awards
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Launch mode: create static award categories like Best Batsman,
              Best Bowler, MVP, Best Keeper, Captain, and Emerging Player.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/rankings"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View Public Rankings
            </a>
            <button
              onClick={loadRankings}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total Rows" value={rows.length.toString()} />
          <SummaryCard label="Active Rows" value={activeCount.toString()} />
          <SummaryCard label="Homepage Top 5" value={`${Math.min(homeCount, 5)} / 5`} />
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {errorText ? (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorText}
          </div>
        ) : null}

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Add Static Award
              </p>
              <h2 className="mt-1 text-xl font-bold">Create new player ranking row</h2>
            </div>

            <button
              onClick={createRow}
              disabled={creating}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Row"}
            </button>
          </div>

          <RankingForm
            value={newRow}
            onChange={handleNewChange}
            onUpload={handleNewPhotoUpload}
            isNew
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Existing Awards
              </p>
              <h2 className="mt-1 text-xl font-bold">Edit player ranking rows</h2>
            </div>
            <p className="text-xs text-slate-400">
              Homepage displays first 5 active homepage-enabled rows.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-300">
              Loading player rankings...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
              No player ranking rows yet. Create your first static award above.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRows.map((row) => {
                const player = getPlayer(row);
                const form = formState[row.id] || EMPTY_EDITABLE;
                const displayName = getDisplayName(row);
                const photo = getDisplayPhoto(row);
                const playerCode = getPlayerCode(player);

                return (
                  <div
                    key={row.id}
                    className="rounded-3xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        {photo ? (
                          <img
                            src={photo}
                            alt={displayName}
                            className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-lg font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-white">
                            {displayName}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {form.award_category || "Award"} ·{" "}
                            {playerCode || row.player_id || "Static row"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill active={form.is_active} label="Active" />
                        <StatusPill active={form.show_on_homepage} label="Homepage" />

                        <button
                          onClick={() => saveRow(row.id)}
                          disabled={savingId === row.id}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                          {savingId === row.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={() => deleteRow(row.id)}
                          disabled={deletingId === row.id}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-red-400/40 bg-red-500/10 px-4 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {deletingId === row.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <RankingForm
                      value={form}
                      onChange={(field, value) => handleChange(row.id, field, value)}
                      onUpload={(file) => handlePlayerPhotoUpload(row.id, file)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RankingForm({
  value,
  onChange,
  onUpload,
  isNew = false,
}: {
  value: EditableRow;
  onChange: (field: keyof EditableRow, value: string | boolean) => void;
  onUpload: (file: File) => void;
  isNew?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SelectField
        label="Award Category"
        value={value.award_category}
        onChange={(next) => onChange("award_category", next)}
        options={PLAYER_AWARD_CATEGORIES}
      />

      <InputField
        label="Player Display Name *"
        value={value.player_display_name}
        onChange={(next) => onChange("player_display_name", next)}
        placeholder="Example: Arshad Raza"
      />

      <InputField
        label="Team Name"
        value={value.team_display_name}
        onChange={(next) => onChange("team_display_name", next)}
        placeholder="Example: India Blue"
      />

      <SelectField
        label="Badge Color"
        value={value.badge_color}
        onChange={(next) => onChange("badge_color", next)}
        options={BADGE_COLORS}
      />

      <InputField
        label="Rank"
        type="number"
        value={value.rank_position}
        onChange={(next) => onChange("rank_position", next)}
      />

      <InputField
        label="Matches"
        type="number"
        value={value.matches}
        onChange={(next) => onChange("matches", next)}
      />

      <InputField
        label="Runs"
        type="number"
        value={value.runs}
        onChange={(next) => onChange("runs", next)}
      />

      <InputField
        label="Wickets"
        type="number"
        value={value.wickets}
        onChange={(next) => onChange("wickets", next)}
      />

      <InputField
        label="Average"
        type="number"
        value={value.average}
        onChange={(next) => onChange("average", next)}
      />

      <InputField
        label="Strike Rate"
        type="number"
        value={value.strike_rate}
        onChange={(next) => onChange("strike_rate", next)}
      />

      <InputField
        label="Economy"
        type="number"
        value={value.economy}
        onChange={(next) => onChange("economy", next)}
      />

      <InputField
        label="Rating"
        type="number"
        value={value.rating}
        onChange={(next) => onChange("rating", next)}
      />

      <InputField
        label="Stat Summary"
        value={value.stat_value}
        onChange={(next) => onChange("stat_value", next)}
        placeholder="Example: 245 runs / 11 wickets"
      />

      <InputField
        label="Season"
        value={value.season}
        onChange={(next) => {
          onChange("season", next);
          onChange("season_label", next);
        }}
        placeholder="current"
      />

      <InputField
        label="Sort Order"
        type="number"
        value={value.sort_order}
        onChange={(next) => onChange("sort_order", next)}
      />

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Player Photo
        </label>
        <div className="flex items-center gap-3">
          {value.player_photo_url ? (
            <img
              src={value.player_photo_url}
              alt="Player"
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-300">
              +
            </div>
          )}

          <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {isNew ? (
          <p className="mt-2 text-xs text-slate-500">
            Upload first, then Create Row.
          </p>
        ) : null}
      </div>

      <ToggleField
        label="Active"
        checked={value.is_active}
        onChange={(next) => onChange("is_active", next)}
      />

      <ToggleField
        label="Show on Homepage"
        checked={value.show_on_homepage}
        onChange={(next) => onChange("show_on_homepage", next)}
      />
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/8 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-emerald-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white">
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-10 items-center rounded-xl px-3 text-xs font-bold ${
        active
          ? "bg-emerald-500/20 text-emerald-200"
          : "bg-slate-700/50 text-slate-300"
      }`}
    >
      {label}
    </span>
  );
}

function toNullableNumber(value: string) {
  if (value.trim() === "") return null;
  return Number(value);
}
