"use client";

import { useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type CsvRow = Record<string, string>;

type ParsedPlayerRow = {
  playerName: string;
  normalizedName: string;
  teamName: string;
  yearLabel: string;
  matches: number;
  innings: number;
  runs: number;
  wickets: number;
  battingAverage: number;
  strikeRate: number;
  economy: number;
  mvpPoints: number;
  battingScore: number;
  bowlingScore: number;
  allRoundScore: number;
  fieldingScore: number;
  hybridScore: number;
  tournaments: string;
  raw: CsvRow;
};

const REQUIRED_HEADERS = [
  "Period",
  "Player Name",
  "Team Name",
  "Matches",
  "Runs",
  "Wickets",
  "MVP Points",
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  if (rows.length < 2) return { headers: [] as string[], data: [] as CsvRow[] };

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  const data = rows.slice(1).map((cells) => {
    const item: CsvRow = {};
    headers.forEach((header, index) => {
      item[header] = cells[index]?.trim() ?? "";
    });
    return item;
  });

  return { headers, data };
}

function hasRequiredHeaders(headers: string[]) {
  const headerSet = new Set(headers.map((header) => header.trim()));
  return REQUIRED_HEADERS.every((header) => headerSet.has(header));
}

function get(row: CsvRow, key: string) {
  return row[key]?.trim() ?? "";
}

function toNumber(value: string) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown-player";
}

function mapRow(row: CsvRow): ParsedPlayerRow {
  const playerName = get(row, "Player Name");
  const period = get(row, "Period") || get(row, "Years") || "All Time";

  return {
    playerName,
    normalizedName: normalizeName(playerName),
    teamName: get(row, "Team Name") || get(row, "Teams Played For") || "Unknown Team",
    yearLabel: period,
    matches: toNumber(get(row, "Matches")),
    innings: toNumber(get(row, "Bat Innings")),
    runs: toNumber(get(row, "Runs")),
    wickets: toNumber(get(row, "Wickets")),
    battingAverage: toNumber(get(row, "Bat Avg")),
    strikeRate: toNumber(get(row, "Bat SR")),
    economy: toNumber(get(row, "Economy")),
    mvpPoints: toNumber(get(row, "MVP Points")),
    battingScore: toNumber(get(row, "Batting Score")),
    bowlingScore: toNumber(get(row, "Bowling Score")),
    allRoundScore: toNumber(get(row, "All-Round Score")),
    fieldingScore: toNumber(get(row, "Fielding Score")),
    hybridScore: toNumber(get(row, "Hybrid Score")),
    tournaments: get(row, "Tournaments"),
    raw: row,
  };
}

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

export default function AdminPlayerDirectoryImportPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedPlayerRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const summary = useMemo(() => {
    const players = new Set(rows.map((row) => row.normalizedName));
    const teams = new Set(rows.map((row) => row.teamName).filter(Boolean));
    const years = new Set(rows.map((row) => row.yearLabel).filter(Boolean));
    return { players: players.size, teams: teams.size, years: years.size, rows: rows.length };
  }, [rows]);

  async function handleFile(file: File) {
    setMessage("");
    setMessageType("");

    const text = await file.text();
    const { headers, data } = parseCsv(text);

    if (!hasRequiredHeaders(headers)) {
      setRows([]);
      setFileName("");
      setMessage(`Invalid CSV. Required headers: ${REQUIRED_HEADERS.join(", ")}`);
      setMessageType("error");
      return;
    }

    const mapped = data
      .map(mapRow)
      .filter((row) => row.playerName && row.normalizedName && row.teamName);

    if (mapped.length === 0) {
      setRows([]);
      setFileName("");
      setMessage("CSV parsed, but no valid player rows were found.");
      setMessageType("error");
      return;
    }

    setRows(mapped);
    setFileName(file.name);
    setMessage(`${mapped.length} player-year rows loaded successfully.`);
    setMessageType("success");
  }

  async function importRows() {
    if (rows.length === 0) {
      setMessage("Please upload the yearly player performance CSV first.");
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(
      "This will replace the existing CSV-based player directory. Continue?"
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const { error: deleteError } = await supabase
        .from("player_directory_csv")
        .delete()
        .gte("created_at", "1900-01-01");

      if (deleteError) throw deleteError;

      const now = new Date().toISOString();
      const payload = rows.map((row) => ({
        player_name: row.playerName,
        normalized_name: row.normalizedName,
        team_name: row.teamName,
        year_label: row.yearLabel,
        matches: row.matches,
        innings: row.innings,
        runs: row.runs,
        wickets: row.wickets,
        batting_average: row.battingAverage,
        strike_rate: row.strikeRate,
        economy: row.economy,
        mvp_points: row.mvpPoints,
        batting_score: row.battingScore,
        bowling_score: row.bowlingScore,
        all_round_score: row.allRoundScore,
        fielding_score: row.fieldingScore,
        hybrid_score: row.hybridScore,
        bio: JSON.stringify({ ...row.raw, source_file: fileName, tournaments: row.tournaments }),
        is_active: true,
        show_on_public: true,
        updated_at: now,
      }));

      const chunkSize = 400;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("player_directory_csv").insert(chunk);
        if (error) throw error;
      }

      setMessage(`Player directory imported successfully. ${payload.length} rows saved.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Import failed. ${formatError(error)}`);
      setMessageType("error");
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
            Player Directory Import
          </p>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
            Build the public players directory from CCE yearly CSV.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            Use CCE_Player_Yearly_Performance.csv to list players team-wise until the online registration profile system is finalized.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        {message ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              messageType === "error"
                ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            }`}
          >
            {message}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                CSV Source
              </p>
              <h2 className="mt-2 text-2xl font-bold">Upload yearly player performance CSV</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Required headers include Period, Player Name, Team Name, Matches, Runs, Wickets and MVP Points. All other columns are preserved inside the player detail payload.
              </p>
            </div>
            <a
              href="/players"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              View Public Players
            </a>
          </div>

          <input
            type="file"
            accept=".csv"
            className="mt-5 block w-full text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {fileName ? <p className="mt-3 text-sm text-slate-600">Loaded file: {fileName}</p> : null}

          {rows.length > 0 ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <SummaryCard label="Rows" value={summary.rows} />
                <SummaryCard label="Unique Players" value={summary.players} />
                <SummaryCard label="Teams" value={summary.teams} />
                <SummaryCard label="Periods" value={summary.years} />
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Period</th>
                      <th className="px-3 py-3 font-semibold">Player</th>
                      <th className="px-3 py-3 font-semibold">Team</th>
                      <th className="px-3 py-3 font-semibold">Matches</th>
                      <th className="px-3 py-3 font-semibold">Runs</th>
                      <th className="px-3 py-3 font-semibold">Wickets</th>
                      <th className="px-3 py-3 font-semibold">MVP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 15).map((row, index) => (
                      <tr key={`${row.normalizedName}-${row.yearLabel}-${index}`} className="border-t border-slate-200">
                        <td className="px-3 py-3">{row.yearLabel}</td>
                        <td className="px-3 py-3 font-semibold">{row.playerName}</td>
                        <td className="px-3 py-3">{row.teamName}</td>
                        <td className="px-3 py-3">{row.matches}</td>
                        <td className="px-3 py-3">{row.runs}</td>
                        <td className="px-3 py-3">{row.wickets}</td>
                        <td className="px-3 py-3">{row.mvpPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={importRows}
            disabled={saving || rows.length === 0}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Importing..." : `Replace & Import Player Directory (${rows.length})`}
          </button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
