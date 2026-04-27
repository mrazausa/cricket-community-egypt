"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type CsvRow = Record<string, string>;

type CceRankingRow = {
  period: string;
  category: string;
  rank: number | null;
  playerName: string;
  teamName: string;
  matches: number | null;
  runs: number | null;
  wickets: number | null;
  mvpPoints: number | null;
  score: number | null;
  scoreField: string;
};

type TeamCsvRow = {
  team_id: string;
  rank_position: string;
  points: string;
  matches: string;
  wins: string;
  form: string;
  rating: string;
  season_label: string;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(value.trim());
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      current.push(value.trim());
      value = "";
      if (current.some((item) => item !== "")) rows.push(current);
      current = [];
      continue;
    }

    value += char;
  }

  current.push(value.trim());
  if (current.some((item) => item !== "")) rows.push(current);

  if (rows.length < 2) return { headers: [] as string[], rows: [] as CsvRow[] };

  const headers = rows[0].map((header) => header.trim());
  const dataRows = rows.slice(1).map((items) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = items[index]?.trim() ?? "";
    });
    return row;
  });

  return { headers, rows: dataRows };
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/,/g, "").trim();
  if (!text) return null;
  const numberValue = Number(text);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasRequiredHeaders(headers: string[], required: string[]) {
  const normalized = new Set(headers.map((header) => header.trim().toLowerCase()));
  return required.every((item) => normalized.has(item.toLowerCase()));
}

function getValue(row: CsvRow, key: string) {
  const exact = row[key];
  if (exact !== undefined) return exact;
  const foundKey = Object.keys(row).find(
    (item) => item.trim().toLowerCase() === key.trim().toLowerCase()
  );
  return foundKey ? row[foundKey] : "";
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

function normalizeCategory(category: string) {
  const value = category.trim();
  if (!value) return "Overall";
  return value;
}

function badgeForCategory(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes("mvp") || lower.includes("overall")) return "gold";
  if (lower.includes("bat") || lower.includes("run")) return "emerald";
  if (lower.includes("bowl") || lower.includes("wicket")) return "blue";
  if (lower.includes("round")) return "purple";
  if (lower.includes("field")) return "rose";
  return "slate";
}

function buildStatValue(row: CceRankingRow) {
  const parts = [
    `${row.runs ?? 0} runs`,
    `${row.wickets ?? 0} wkts`,
    `${row.matches ?? 0} matches`,
  ];

  if (row.mvpPoints !== null) parts.push(`MVP ${row.mvpPoints}`);
  if (row.score !== null) parts.push(`Score ${row.score}`);

  return parts.join(" • ");
}

function mapCceRow(row: CsvRow): CceRankingRow {
  return {
    period: getValue(row, "Period") || "All Time",
    category: normalizeCategory(getValue(row, "Category")),
    rank: toNumber(getValue(row, "Rank")),
    playerName: getValue(row, "Player Name"),
    teamName: getValue(row, "Team Name"),
    matches: toNumber(getValue(row, "Matches")),
    runs: toNumber(getValue(row, "Runs")),
    wickets: toNumber(getValue(row, "Wickets")),
    mvpPoints: toNumber(getValue(row, "MVP Points")),
    score: toNumber(getValue(row, "Score")),
    scoreField: getValue(row, "Score Field"),
  };
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function AdminRankingsPage() {
  const [cceRows, setCceRows] = useState<CceRankingRow[]>([]);
  const [teamRows, setTeamRows] = useState<TeamCsvRow[]>([]);
  const [cceFileName, setCceFileName] = useState("");
  const [teamFileName, setTeamFileName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("All Time");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [savingCce, setSavingCce] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const periods = useMemo(() => uniqueSorted(cceRows.map((row) => row.period)), [cceRows]);
  const categories = useMemo(() => uniqueSorted(cceRows.map((row) => row.category)), [cceRows]);

  const filteredCceRows = useMemo(() => {
    return cceRows.filter((row) => {
      const periodOk = selectedPeriod === "All Periods" || row.period === selectedPeriod;
      const categoryOk = selectedCategory === "All Categories" || row.category === selectedCategory;
      return periodOk && categoryOk;
    });
  }, [cceRows, selectedPeriod, selectedCategory]);

  const groupedSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of cceRows) {
      const key = `${row.period}|||${row.category}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([key, count]) => {
      const [period, category] = key.split("|||");
      return { period, category, count };
    });
  }, [cceRows]);

  async function handleCceCsvUpload(file: File) {
    setMessage("");
    setMessageType("");

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    const requiredHeaders = [
      "Period",
      "Category",
      "Rank",
      "Player Name",
      "Team Name",
      "Matches",
      "Runs",
      "Wickets",
      "MVP Points",
      "Score",
      "Score Field",
    ];

    if (!hasRequiredHeaders(headers, requiredHeaders)) {
      setMessage(`Invalid CCE Ranking CSV. Required headers: ${requiredHeaders.join(", ")}`);
      setMessageType("error");
      setCceRows([]);
      setCceFileName("");
      return;
    }

    const mapped = rows
      .map(mapCceRow)
      .filter((row) => row.playerName && row.category && row.period && row.rank !== null);

    if (!mapped.length) {
      setMessage("CSV parsed, but no valid ranking rows were found.");
      setMessageType("error");
      setCceRows([]);
      setCceFileName("");
      return;
    }

    setCceRows(mapped);
    setCceFileName(file.name);
    setSelectedPeriod(mapped.some((row) => row.period === "All Time") ? "All Time" : mapped[0].period);
    setSelectedCategory("All Categories");
    setMessage(`CCE ranking CSV loaded successfully. ${mapped.length} rows ready.`);
    setMessageType("success");
  }

  async function handleTeamCsvUpload(file: File) {
    setMessage("");
    setMessageType("");

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    const requiredHeaders = [
      "team_id",
      "rank_position",
      "points",
      "matches",
      "wins",
      "form",
      "rating",
      "season_label",
    ];

    if (!hasRequiredHeaders(headers, requiredHeaders)) {
      setMessage(`Invalid Team Rankings CSV. Required headers: ${requiredHeaders.join(", ")}`);
      setMessageType("error");
      setTeamRows([]);
      setTeamFileName("");
      return;
    }

    setTeamRows(rows as TeamCsvRow[]);
    setTeamFileName(file.name);
    setMessage(`Team rankings CSV loaded successfully. ${rows.length} rows ready.`);
    setMessageType("success");
  }

  async function importCceRankings() {
    if (!filteredCceRows.length) {
      setMessage("Please upload a valid CCE ranking CSV and select rows to import.");
      setMessageType("error");
      return;
    }

    setSavingCce(true);
    setMessage("");
    setMessageType("");

    try {
      const importBatchId = crypto.randomUUID();
      const now = new Date().toISOString();
      const groups = new Map<string, CceRankingRow[]>();

      for (const row of filteredCceRows) {
        const key = `${row.period}|||${row.category}`;
        const current = groups.get(key) || [];
        current.push(row);
        groups.set(key, current);
      }

      for (const [key] of groups) {
        const [period, category] = key.split("|||");
        const { error: deleteError } = await supabase
          .from("player_rankings")
          .delete()
          .eq("season_label", period)
          .eq("award_category", category);

        if (deleteError) throw deleteError;
      }

      const payload = filteredCceRows.map((row, index) => {
        const rating = row.category.toLowerCase().includes("mvp")
          ? row.mvpPoints ?? row.score ?? 0
          : row.score ?? row.mvpPoints ?? 0;

        return {
          player_id: null,
          rank_position: row.rank,
          category: row.category,
          award_category: row.category,
          badge_color: badgeForCategory(row.category),
          player_display_name: row.playerName,
          player_name_override: row.playerName,
          team_display_name: row.teamName,
          matches: row.matches ?? 0,
          runs: row.runs ?? 0,
          wickets: row.wickets ?? 0,
          average: 0,
          strike_rate: 0,
          economy: 0,
          rating,
          stat_value: buildStatValue(row),
          season: row.period,
          season_label: row.period,
          period_label: row.period,
          source_file: cceFileName || "CCE_Category_Top10_By_Period.csv",
          score_field: row.scoreField,
          mvp_points: row.mvpPoints ?? 0,
          sort_order: row.rank ?? index + 1,
          is_active: true,
          show_on_homepage: row.period === "All Time" && row.rank !== null && row.rank <= 3,
          import_batch_id: importBatchId,
          created_at: now,
          updated_at: now,
        };
      });

      const { error: insertError } = await supabase.from("player_rankings").insert(payload);
      if (insertError) throw insertError;

      const logRows = Array.from(groups.entries()).map(([key, rows]) => {
        const [period, category] = key.split("|||");
        return {
          source_file: cceFileName || "CCE_Category_Top10_By_Period.csv",
          import_type: "CCE_CATEGORY_TOP10",
          period_label: period,
          category_label: category,
          rows_imported: rows.length,
          imported_by: "admin",
        };
      });

      const { error: logError } = await supabase.from("ranking_import_logs").insert(logRows);
      if (logError) console.warn("Ranking import log failed:", logError);

      setMessage(`CCE player rankings imported successfully. ${payload.length} rows inserted.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to import CCE rankings. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSavingCce(false);
    }
  }

  async function importTeamRankings() {
    if (!teamRows.length) {
      setMessage("Please upload a valid Team Rankings CSV first.");
      setMessageType("error");
      return;
    }

    setSavingTeam(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = teamRows.map((row) => ({
        team_id: row.team_id || null,
        rank_position: toNumber(row.rank_position),
        points: toNumber(row.points),
        matches: toNumber(row.matches),
        wins: toNumber(row.wins),
        form: row.form || null,
        rating: toNumber(row.rating),
        season_label: row.season_label || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: deleteError } = await supabase.from("team_rankings").delete().neq("id", "");
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from("team_rankings").insert(payload);
      if (insertError) throw insertError;

      setMessage(`Team rankings imported successfully. ${payload.length} rows inserted.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to import team rankings. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSavingTeam(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Rankings Import Hub
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Build CCE rankings automatically from CSV.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Upload the consolidated CCE category CSV, preview period/category rows, then import only the selected ranking group without deleting other rankings.
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

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                CCE Category Top 10 CSV
              </p>
              <h2 className="mt-2 text-2xl font-bold">Import Player Ranking Engine</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Recommended file: CCE_Category_Top10_By_Period.csv. The import maps Period, Category, Rank, Player Name, Team Name, Matches, Runs, Wickets, MVP Points, Score, and Score Field into player_rankings.
              </p>
            </div>
            <Link
              href="/admin/player-rankings"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Open Manual Editor
            </Link>
          </div>

          <input
            type="file"
            accept=".csv"
            className="mt-5 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCceCsvUpload(file);
            }}
          />

          {cceFileName ? <p className="mt-3 text-sm text-slate-600">Loaded file: {cceFileName}</p> : null}

          {cceRows.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[280px_280px_1fr]">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Period</span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold"
                >
                  <option value="All Periods">All Periods</option>
                  {periods.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Category</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold"
                >
                  <option value="All Categories">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
                <p className="font-bold text-slate-900">Selected import scope</p>
                <p className="mt-1">Rows ready: {filteredCceRows.length}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Existing rows are deleted only for the same Period + Category being imported.
                </p>
              </div>
            </div>
          ) : null}

          {groupedSummary.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {groupedSummary.slice(0, 12).map((item) => (
                <div key={`${item.period}-${item.category}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.period}</p>
                  <p className="mt-1 font-black text-slate-900">{item.category}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.count} rows</p>
                </div>
              ))}
            </div>
          ) : null}

          {filteredCceRows.length > 0 ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Period</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Rank</th>
                    <th className="px-3 py-3 font-semibold">Player</th>
                    <th className="px-3 py-3 font-semibold">Team</th>
                    <th className="px-3 py-3 font-semibold">Runs</th>
                    <th className="px-3 py-3 font-semibold">Wkts</th>
                    <th className="px-3 py-3 font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCceRows.slice(0, 15).map((row, index) => (
                    <tr key={`${row.period}-${row.category}-${row.rank}-${row.playerName}-${index}`} className="border-t border-slate-200">
                      <td className="px-3 py-3">{row.period}</td>
                      <td className="px-3 py-3">{row.category}</td>
                      <td className="px-3 py-3 font-bold">#{row.rank}</td>
                      <td className="px-3 py-3 font-semibold">{row.playerName}</td>
                      <td className="px-3 py-3">{row.teamName}</td>
                      <td className="px-3 py-3">{row.runs ?? 0}</td>
                      <td className="px-3 py-3">{row.wickets ?? 0}</td>
                      <td className="px-3 py-3">{row.score ?? row.mvpPoints ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <button
            type="button"
            onClick={importCceRankings}
            disabled={savingCce || filteredCceRows.length === 0}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingCce ? "Importing..." : `Import Selected CCE Rankings (${filteredCceRows.length})`}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Optional Team Rankings CSV</p>
          <h2 className="mt-2 text-2xl font-bold">Import Team Standings</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use this only when you have a team standings CSV with required columns: team_id, rank_position, points, matches, wins, form, rating, season_label.
          </p>

          <input
            type="file"
            accept=".csv"
            className="mt-5 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleTeamCsvUpload(file);
            }}
          />

          {teamFileName ? <p className="mt-3 text-sm text-slate-600">Loaded file: {teamFileName}</p> : null}

          {teamRows.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Team ID</th>
                    <th className="px-3 py-3 font-semibold">Rank</th>
                    <th className="px-3 py-3 font-semibold">Points</th>
                    <th className="px-3 py-3 font-semibold">Matches</th>
                    <th className="px-3 py-3 font-semibold">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t border-slate-200">
                      <td className="px-3 py-3">{row.team_id}</td>
                      <td className="px-3 py-3">{row.rank_position}</td>
                      <td className="px-3 py-3">{row.points}</td>
                      <td className="px-3 py-3">{row.matches}</td>
                      <td className="px-3 py-3">{row.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <button
            type="button"
            onClick={importTeamRankings}
            disabled={savingTeam || teamRows.length === 0}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingTeam ? "Importing..." : "Import Team Rankings"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/admin/player-rankings" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-xl font-bold text-slate-900">Player Rankings Editor</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Fine-tune names, photos, stats, homepage visibility, and active status after CSV import.</p>
          </Link>

          <Link href="/admin/team-rankings" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-xl font-bold text-slate-900">Team Rankings Editor</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Upload logos and correct standings manually if required.</p>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
