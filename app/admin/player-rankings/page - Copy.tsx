"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";

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
  rating: number | null;
  stat_value: string | null;
  season_label: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  players?: PlayerInfo | PlayerInfo[] | null;
};

type EditableRow = {
  rank_position: string;
  category: string;
  rating: string;
  stat_value: string;
  season_label: string;
};

const EMPTY_EDITABLE: EditableRow = {
  rank_position: "",
  category: "",
  rating: "",
  stat_value: "",
  season_label: "",
};

export default function AdminPlayerRankingsPage() {
  const [rows, setRows] = useState<PlayerRankingRow[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

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
          rating,
          stat_value,
          season_label,
          created_at,
          updated_at,
          players (*)
        `
      )
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
      nextFormState[row.id] = {
        rank_position: row.rank_position?.toString() ?? "",
        category: row.category ?? "",
        rating: row.rating?.toString() ?? "",
        stat_value: row.stat_value ?? "",
        season_label: row.season_label ?? "",
      };
    }

    setFormState(nextFormState);
    setLoading(false);
  }

  useEffect(() => {
    loadRankings();
  }, []);

  function getPlayer(row: PlayerRankingRow): PlayerInfo | null {
    if (!row.players) return null;
    if (Array.isArray(row.players)) return row.players[0] ?? null;
    return row.players;
  }

  function getPlayerName(player: PlayerInfo | null) {
    if (!player) return "Unknown Player";
    return (
      player.name ||
      player.full_name ||
      player.player_name ||
      player.display_name ||
      "Unknown Player"
    );
  }

  function getPlayerImage(player: PlayerInfo | null) {
    if (!player) return null;
    return (
      player.image_url ||
      player.photo_url ||
      player.avatar_url ||
      player.profile_image_url ||
      null
    );
  }

  function getPlayerCode(player: PlayerInfo | null) {
    if (!player) return null;
    return player.player_code || null;
  }

  function handleChange(
    rowId: string,
    field: keyof EditableRow,
    value: string
  ) {
    setFormState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || EMPTY_EDITABLE),
        [field]: value,
      },
    }));
  }

  async function saveRow(rowId: string) {
    const current = formState[rowId];
    if (!current) return;

    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const payload = {
      rank_position:
        current.rank_position === "" ? null : Number(current.rank_position),
      category: current.category.trim() === "" ? null : current.category.trim(),
      rating: current.rating === "" ? null : Number(current.rating),
      stat_value:
        current.stat_value.trim() === "" ? null : current.stat_value.trim(),
      season_label:
        current.season_label.trim() === ""
          ? null
          : current.season_label.trim(),
    };

    if (
      (payload.rank_position !== null && Number.isNaN(payload.rank_position)) ||
      (payload.rating !== null && Number.isNaN(payload.rating))
    ) {
      setErrorText("Please enter valid numeric values for rank position and rating.");
      setSavingId(null);
      return;
    }

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

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aPos = a.rank_position ?? 999999;
      const bPos = b.rank_position ?? 999999;
      return aPos - bPos;
    });
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400/80">
              Admin Panel
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Player Rankings Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Edit player rankings directly from Supabase. Each row is saved
              individually and does not affect your existing public pages.
            </p>
          </div>

          <button
            onClick={loadRankings}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
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

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20">
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-slate-300">
              Loading player rankings...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-300">
              No player rankings found.
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 md:hidden">
                {sortedRows.map((row) => {
                  const player = getPlayer(row);
                  const image = getPlayerImage(player);
                  const playerName = getPlayerName(player);
                  const playerCode = getPlayerCode(player);
                  const form = formState[row.id] || EMPTY_EDITABLE;

                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        {image ? (
                          <img
                            src={image}
                            alt={playerName}
                            className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                            {playerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <h2 className="text-base font-semibold text-white">
                            {playerName}
                          </h2>
                          <p className="text-xs text-slate-400">
                            {playerCode
                              ? `Code: ${playerCode}`
                              : `player_id: ${row.player_id || "N/A"}`}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          label="Rank"
                          type="number"
                          value={form.rank_position}
                          onChange={(value) =>
                            handleChange(row.id, "rank_position", value)
                          }
                        />
                        <Field
                          label="Rating"
                          type="number"
                          value={form.rating}
                          onChange={(value) =>
                            handleChange(row.id, "rating", value)
                          }
                        />
                      </div>

                      <div className="mt-3 grid gap-3">
                        <Field
                          label="Category"
                          value={form.category}
                          onChange={(value) =>
                            handleChange(row.id, "category", value)
                          }
                        />
                        <Field
                          label="Stats"
                          value={form.stat_value}
                          onChange={(value) =>
                            handleChange(row.id, "stat_value", value)
                          }
                        />
                        <Field
                          label="Season Label"
                          value={form.season_label}
                          onChange={(value) =>
                            handleChange(row.id, "season_label", value)
                          }
                        />
                      </div>

                      <button
                        onClick={() => saveRow(row.id)}
                        disabled={savingId === row.id}
                        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === row.id ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-left text-slate-300">
                    <tr>
                      <th className="px-4 py-4 font-medium">Player</th>
                      <th className="px-4 py-4 font-medium">Rank</th>
                      <th className="px-4 py-4 font-medium">Category</th>
                      <th className="px-4 py-4 font-medium">Stats</th>
                      <th className="px-4 py-4 font-medium">Rating</th>
                      <th className="px-4 py-4 font-medium">Season</th>
                      <th className="px-4 py-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const player = getPlayer(row);
                      const image = getPlayerImage(player);
                      const playerName = getPlayerName(player);
                      const playerCode = getPlayerCode(player);
                      const form = formState[row.id] || EMPTY_EDITABLE;

                      return (
                        <tr
                          key={row.id}
                          className="border-t border-white/10 bg-slate-950/20"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {image ? (
                                <img
                                  src={image}
                                  alt={playerName}
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                                  {playerName.slice(0, 1).toUpperCase()}
                                </div>
                              )}

                              <div>
                                <div className="font-semibold text-white">
                                  {playerName}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {playerCode
                                    ? `Code: ${playerCode}`
                                    : row.player_id || "No player_id"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              value={form.rank_position}
                              onChange={(e) =>
                                handleChange(
                                  row.id,
                                  "rank_position",
                                  e.target.value
                                )
                              }
                              className="h-10 w-20 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={form.category}
                              onChange={(e) =>
                                handleChange(row.id, "category", e.target.value)
                              }
                              className="h-10 w-36 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={form.stat_value}
                              onChange={(e) =>
                                handleChange(row.id, "stat_value", e.target.value)
                              }
                              className="h-10 w-56 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              value={form.rating}
                              onChange={(e) =>
                                handleChange(row.id, "rating", e.target.value)
                              }
                              className="h-10 w-24 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={form.season_label}
                              onChange={(e) =>
                                handleChange(
                                  row.id,
                                  "season_label",
                                  e.target.value
                                )
                              }
                              className="h-10 w-28 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <button
                              onClick={() => saveRow(row.id)}
                              disabled={savingId === row.id}
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingId === row.id ? "Saving..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400"
      />
    </label>
  );
}