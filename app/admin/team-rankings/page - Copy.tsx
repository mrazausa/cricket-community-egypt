"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";

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
  form: string | null;
  rating: number | null;
  season_label: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  teams?: TeamInfo | TeamInfo[] | null;
};

type EditableRow = {
  rank_position: string;
  points: string;
  matches: string;
  wins: string;
  form: string;
  rating: string;
  season_label: string;
};

type CsvTeamRow = {
  team_id: string;
  rank_position: string;
  points: string;
  matches: string;
  wins: string;
  form: string;
  rating: string;
  season_label: string;
};

const EMPTY_EDITABLE: EditableRow = {
  rank_position: "",
  points: "",
  matches: "",
  wins: "",
  form: "",
  rating: "",
  season_label: "",
};

const REQUIRED_CSV_HEADERS = [
  "team_id",
  "rank_position",
  "points",
  "matches",
  "wins",
  "form",
  "rating",
  "season_label",
];

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((item) => item.replace(/^"(.*)"$/, "$1").trim());
}

function parseCsv(text: string) {
  const rawLines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (rawLines.length === 0) {
    return {
      headers: [] as string[],
      rows: [] as Record<string, string>[],
    };
  }

  const headers = parseCsvLine(rawLines[0]).map((h) => h.trim());
  const rows = rawLines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function hasRequiredHeaders(headers: string[]) {
  const normalized = new Set(headers.map((item) => item.trim()));
  return REQUIRED_CSV_HEADERS.every((header) => normalized.has(header));
}

function csvSample() {
  return [
    "team_id,rank_position,points,matches,wins,form,rating,season_label",
    "TEAM_UUID_1,1,10,5,5,WWWWW,98,Azhar Cricket Trophy 2026",
    "TEAM_UUID_2,2,8,5,4,WWWLW,91,Azhar Cricket Trophy 2026",
  ].join("\n");
}

export default function AdminTeamRankingsPage() {
  const [rows, setRows] = useState<TeamRankingRow[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const [csvFileName, setCsvFileName] = useState("");
  const [csvRows, setCsvRows] = useState<CsvTeamRow[]>([]);
  const [importing, setImporting] = useState(false);

  async function loadRankings() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("team_rankings")
      .select(
        `
          id,
          team_id,
          rank_position,
          points,
          matches,
          wins,
          form,
          rating,
          season_label,
          created_at,
          updated_at,
          teams (
            id,
            name,
            slug,
            logo_url,
            badge
          )
        `
      )
      .order("rank_position", { ascending: true });

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
    for (const row of safeRows) {
      nextFormState[row.id] = {
        rank_position: row.rank_position?.toString() ?? "",
        points: row.points?.toString() ?? "",
        matches: row.matches?.toString() ?? "",
        wins: row.wins?.toString() ?? "",
        form: row.form ?? "",
        rating: row.rating?.toString() ?? "",
        season_label: row.season_label ?? "",
      };
    }
    setFormState(nextFormState);

    setLoading(false);
  }

  useEffect(() => {
    loadRankings();
  }, []);

  function getTeam(row: TeamRankingRow): TeamInfo | null {
    if (!row.teams) return null;
    if (Array.isArray(row.teams)) return row.teams[0] ?? null;
    return row.teams;
  }

  function getTeamImage(team: TeamInfo | null) {
    if (!team) return null;
    return team.logo_url || team.badge || null;
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
      points: current.points === "" ? null : Number(current.points),
      matches: current.matches === "" ? null : Number(current.matches),
      wins: current.wins === "" ? null : Number(current.wins),
      form: current.form.trim() === "" ? null : current.form.trim(),
      rating: current.rating === "" ? null : Number(current.rating),
      season_label:
        current.season_label.trim() === ""
          ? null
          : current.season_label.trim(),
    };

    if (
      (payload.rank_position !== null && Number.isNaN(payload.rank_position)) ||
      (payload.points !== null && Number.isNaN(payload.points)) ||
      (payload.matches !== null && Number.isNaN(payload.matches)) ||
      (payload.wins !== null && Number.isNaN(payload.wins)) ||
      (payload.rating !== null && Number.isNaN(payload.rating))
    ) {
      setErrorText(
        "Please enter valid numeric values for rank position, points, matches, wins, and rating."
      );
      setSavingId(null);
      return;
    }

    const { error } = await supabase
      .from("team_rankings")
      .update(payload)
      .eq("id", rowId);

    if (error) {
      console.error("Failed to update team ranking:", error);
      setErrorText(error.message || "Failed to update team ranking.");
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

    setMessage("Team ranking updated successfully.");
    setSavingId(null);
  }

  async function handleCsvUpload(file: File) {
    setMessage("");
    setErrorText("");

    const text = await file.text();
    const { headers, rows: parsedRows } = parseCsv(text);

    if (!hasRequiredHeaders(headers)) {
      setCsvFileName("");
      setCsvRows([]);
      setErrorText(
        `Invalid CSV. Required headers: ${REQUIRED_CSV_HEADERS.join(", ")}`
      );
      return;
    }

    setCsvFileName(file.name);
    setCsvRows(parsedRows as CsvTeamRow[]);
    setMessage(
      `Team rankings CSV loaded successfully. ${parsedRows.length} rows ready to import.`
    );
  }

  async function importCsvRows() {
    if (csvRows.length === 0) {
      setErrorText("Please upload a valid team rankings CSV first.");
      return;
    }

    setImporting(true);
    setMessage("");
    setErrorText("");

    try {
      const payload = csvRows.map((row) => ({
        team_id: row.team_id?.trim() || null,
        rank_position:
          row.rank_position?.trim() === ""
            ? null
            : Number(row.rank_position.trim()),
        points: row.points?.trim() === "" ? null : Number(row.points.trim()),
        matches:
          row.matches?.trim() === "" ? null : Number(row.matches.trim()),
        wins: row.wins?.trim() === "" ? null : Number(row.wins.trim()),
        form: row.form?.trim() || null,
        rating:
          row.rating?.trim() === "" ? null : Number(row.rating.trim()),
        season_label: row.season_label?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const invalidRows = payload.some(
        (row) =>
          !row.team_id ||
          (row.rank_position !== null && Number.isNaN(row.rank_position)) ||
          (row.points !== null && Number.isNaN(row.points)) ||
          (row.matches !== null && Number.isNaN(row.matches)) ||
          (row.wins !== null && Number.isNaN(row.wins)) ||
          (row.rating !== null && Number.isNaN(row.rating))
      );

      if (invalidRows) {
        setErrorText(
          "CSV contains invalid rows. Check team_id, rank_position, points, matches, wins, and rating values."
        );
        setImporting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from("team_rankings")
        .delete()
        .neq("id", "");

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("team_rankings")
        .insert(payload);

      if (insertError) throw insertError;

      setMessage(
        `Team rankings imported successfully. ${payload.length} rows inserted.`
      );
      setCsvRows([]);
      setCsvFileName("");
      await loadRankings();
    } catch (error: any) {
      setErrorText(error?.message || "Failed to import team rankings CSV.");
    } finally {
      setImporting(false);
    }
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
              Team Rankings Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Import team rankings by CSV for fast tournament updates, then
              adjust rows manually if needed.
            </p>
          </div>

          <button
            onClick={loadRankings}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-white">CSV Import</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Required columns:
                <span className="ml-2 font-mono text-emerald-300">
                  {REQUIRED_CSV_HEADERS.join(", ")}
                </span>
              </p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-300">
                {csvSample()}
              </pre>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Upload Team Rankings CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                }}
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-emerald-400"
              />

              {csvFileName ? (
                <p className="mt-3 text-sm text-slate-300">
                  Loaded file: <span className="font-semibold">{csvFileName}</span>
                </p>
              ) : null}

              <button
                onClick={importCsvRows}
                disabled={importing || csvRows.length === 0}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? "Importing..." : "Import and Replace Rankings"}
              </button>
            </div>
          </div>

          {csvRows.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="border-b border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
                CSV Preview ({csvRows.length} rows)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-left text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium">Team ID</th>
                      <th className="px-4 py-3 font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Points</th>
                      <th className="px-4 py-3 font-medium">Matches</th>
                      <th className="px-4 py-3 font-medium">Wins</th>
                      <th className="px-4 py-3 font-medium">Form</th>
                      <th className="px-4 py-3 font-medium">Rating</th>
                      <th className="px-4 py-3 font-medium">Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 10).map((row, index) => (
                      <tr
                        key={`${row.team_id}-${index}`}
                        className="border-t border-white/10 bg-slate-950/20"
                      >
                        <td className="px-4 py-3">{row.team_id}</td>
                        <td className="px-4 py-3">{row.rank_position}</td>
                        <td className="px-4 py-3">{row.points}</td>
                        <td className="px-4 py-3">{row.matches}</td>
                        <td className="px-4 py-3">{row.wins}</td>
                        <td className="px-4 py-3">{row.form}</td>
                        <td className="px-4 py-3">{row.rating}</td>
                        <td className="px-4 py-3">{row.season_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
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
              Loading team rankings...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-300">
              No team rankings found.
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 md:hidden">
                {sortedRows.map((row) => {
                  const team = getTeam(row);
                  const image = getTeamImage(team);
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
                            alt={team?.name || "Team"}
                            className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                            {(team?.name || "T").slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <h2 className="text-base font-semibold text-white">
                            {team?.name || "Unknown Team"}
                          </h2>
                          <p className="text-xs text-slate-400">
                            team_id: {row.team_id || "N/A"}
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
                          label="Points"
                          type="number"
                          value={form.points}
                          onChange={(value) =>
                            handleChange(row.id, "points", value)
                          }
                        />
                        <Field
                          label="Matches"
                          type="number"
                          value={form.matches}
                          onChange={(value) =>
                            handleChange(row.id, "matches", value)
                          }
                        />
                        <Field
                          label="Wins"
                          type="number"
                          value={form.wins}
                          onChange={(value) =>
                            handleChange(row.id, "wins", value)
                          }
                        />
                        <Field
                          label="Form"
                          value={form.form}
                          onChange={(value) =>
                            handleChange(row.id, "form", value)
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

                      <div className="mt-3">
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
                      <th className="px-4 py-4 font-medium">Team</th>
                      <th className="px-4 py-4 font-medium">Rank</th>
                      <th className="px-4 py-4 font-medium">Points</th>
                      <th className="px-4 py-4 font-medium">Matches</th>
                      <th className="px-4 py-4 font-medium">Wins</th>
                      <th className="px-4 py-4 font-medium">Form</th>
                      <th className="px-4 py-4 font-medium">Rating</th>
                      <th className="px-4 py-4 font-medium">Season</th>
                      <th className="px-4 py-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const team = getTeam(row);
                      const image = getTeamImage(team);
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
                                  alt={team?.name || "Team"}
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                                  {(team?.name || "T").slice(0, 1).toUpperCase()}
                                </div>
                              )}

                              <div>
                                <div className="font-semibold text-white">
                                  {team?.name || "Unknown Team"}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {row.team_id || "No team_id"}
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
                              type="number"
                              value={form.points}
                              onChange={(e) =>
                                handleChange(row.id, "points", e.target.value)
                              }
                              className="h-10 w-24 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              value={form.matches}
                              onChange={(e) =>
                                handleChange(row.id, "matches", e.target.value)
                              }
                              className="h-10 w-24 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              value={form.wins}
                              onChange={(e) =>
                                handleChange(row.id, "wins", e.target.value)
                              }
                              className="h-10 w-24 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={form.form}
                              onChange={(e) =>
                                handleChange(row.id, "form", e.target.value)
                              }
                              placeholder="W W W L W"
                              className="h-10 w-32 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
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
                              className="h-10 w-40 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400"
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