"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

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

type PlayerCsvRow = {
  player_id: string;
  rank_position: string;
  category: string;
  rating: string;
  stat_value: string;
  season_label: string;
};

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] as Record<string, string>[] };
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function hasRequiredHeaders(headers: string[], required: string[]) {
  const headerSet = new Set(headers);
  return required.every((item) => headerSet.has(item));
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

export default function AdminRankingsPage() {
  const [teamRows, setTeamRows] = useState<TeamCsvRow[]>([]);
  const [playerRows, setPlayerRows] = useState<PlayerCsvRow[]>([]);
  const [teamFileName, setTeamFileName] = useState("");
  const [playerFileName, setPlayerFileName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const validTeamCsv = useMemo(() => {
    return teamRows.length > 0;
  }, [teamRows]);

  const validPlayerCsv = useMemo(() => {
    return playerRows.length > 0;
  }, [playerRows]);

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
      setMessage(
        `Invalid Team Rankings CSV. Required headers: ${requiredHeaders.join(", ")}`
      );
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

  async function handlePlayerCsvUpload(file: File) {
    setMessage("");
    setMessageType("");

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    const requiredHeaders = [
      "player_id",
      "rank_position",
      "category",
      "rating",
      "stat_value",
      "season_label",
    ];

    if (!hasRequiredHeaders(headers, requiredHeaders)) {
      setMessage(
        `Invalid Player Rankings CSV. Required headers: ${requiredHeaders.join(", ")}`
      );
      setMessageType("error");
      setPlayerRows([]);
      setPlayerFileName("");
      return;
    }

    setPlayerRows(rows as PlayerCsvRow[]);
    setPlayerFileName(file.name);
    setMessage(`Player rankings CSV loaded successfully. ${rows.length} rows ready.`);
    setMessageType("success");
  }

  async function importTeamRankings() {
    if (!validTeamCsv) {
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
        rank_position: row.rank_position ? Number(row.rank_position) : null,
        points: row.points ? Number(row.points) : null,
        matches: row.matches ? Number(row.matches) : null,
        wins: row.wins ? Number(row.wins) : null,
        form: row.form || null,
        rating: row.rating ? Number(row.rating) : null,
        season_label: row.season_label || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const invalidNumeric = payload.some(
        (row) =>
          (row.rank_position !== null && Number.isNaN(row.rank_position)) ||
          (row.points !== null && Number.isNaN(row.points)) ||
          (row.matches !== null && Number.isNaN(row.matches)) ||
          (row.wins !== null && Number.isNaN(row.wins)) ||
          (row.rating !== null && Number.isNaN(row.rating))
      );

      if (invalidNumeric) {
        setMessage("Team CSV has invalid numeric values.");
        setMessageType("error");
        setSavingTeam(false);
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

      setMessage(`Team rankings imported successfully. ${payload.length} rows inserted.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to import team rankings. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSavingTeam(false);
    }
  }

  async function importPlayerRankings() {
    if (!validPlayerCsv) {
      setMessage("Please upload a valid Player Rankings CSV first.");
      setMessageType("error");
      return;
    }

    setSavingPlayer(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = playerRows.map((row) => ({
        player_id: row.player_id || null,
        rank_position: row.rank_position ? Number(row.rank_position) : null,
        category: row.category || null,
        rating: row.rating ? Number(row.rating) : null,
        stat_value: row.stat_value || null,
        season_label: row.season_label || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const invalidNumeric = payload.some(
        (row) =>
          (row.rank_position !== null && Number.isNaN(row.rank_position)) ||
          (row.rating !== null && Number.isNaN(row.rating))
      );

      if (invalidNumeric) {
        setMessage("Player CSV has invalid numeric values.");
        setMessageType("error");
        setSavingPlayer(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from("player_rankings")
        .delete()
        .neq("id", "");

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("player_rankings")
        .insert(payload);

      if (insertError) throw insertError;

      setMessage(`Player rankings imported successfully. ${payload.length} rows inserted.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to import player rankings. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSavingPlayer(false);
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
            Import team and player rankings quickly through CSV.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Upload your latest standings and player leaderboard during the tournament,
            then use the manual editors only for small corrections.
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

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Team Rankings CSV
          </p>
          <h2 className="mt-2 text-2xl font-bold">Import Team Standings</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Required columns: team_id, rank_position, points, matches, wins, form, rating, season_label
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

          {teamFileName ? (
            <p className="mt-3 text-sm text-slate-600">Loaded file: {teamFileName}</p>
          ) : null}

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
            disabled={savingTeam || !validTeamCsv}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingTeam ? "Importing..." : "Import Team Rankings"}
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Player Rankings CSV
          </p>
          <h2 className="mt-2 text-2xl font-bold">Import Player Leaderboard</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Required columns: player_id, rank_position, category, rating, stat_value, season_label
          </p>

          <input
            type="file"
            accept=".csv"
            className="mt-5 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePlayerCsvUpload(file);
            }}
          />

          {playerFileName ? (
            <p className="mt-3 text-sm text-slate-600">Loaded file: {playerFileName}</p>
          ) : null}

          {playerRows.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Player ID</th>
                    <th className="px-3 py-3 font-semibold">Rank</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Rating</th>
                    <th className="px-3 py-3 font-semibold">Stats</th>
                  </tr>
                </thead>
                <tbody>
                  {playerRows.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t border-slate-200">
                      <td className="px-3 py-3">{row.player_id}</td>
                      <td className="px-3 py-3">{row.rank_position}</td>
                      <td className="px-3 py-3">{row.category}</td>
                      <td className="px-3 py-3">{row.rating}</td>
                      <td className="px-3 py-3">{row.stat_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <button
            type="button"
            onClick={importPlayerRankings}
            disabled={savingPlayer || !validPlayerCsv}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingPlayer ? "Importing..." : "Import Player Rankings"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/team-rankings"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-xl font-bold text-slate-900">Team Rankings Editor</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Fine-tune standings manually after CSV import.
            </p>
          </Link>

          <Link
            href="/admin/player-rankings"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-xl font-bold text-slate-900">Player Rankings Editor</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Correct category, stats, or rating row by row after import.
            </p>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}