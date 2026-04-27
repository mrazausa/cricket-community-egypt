"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

const MEDIA_BUCKET = "site-media";

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
};

type MatchRow = {
  id: string;
  tournament_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  title: string | null;
  match_datetime: string | null;
  venue: string | null;
  status: string | null;
  result_summary: string | null;
  player_of_match: string | null;
  key_players: string | null;
  scorecard_pdf_url: string | null;
  external_score_url: string | null;
  is_featured_home: boolean | null;
  match_number: number | null;
  sort_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MatchForm = {
  tournament_id: string;
  team_a_id: string;
  team_b_id: string;
  title: string;
  match_datetime: string;
  venue: string;
  status: string;
  result_summary: string;
  player_of_match: string;
  key_players: string;
  scorecard_pdf_url: string;
  external_score_url: string;
  is_featured_home: boolean;
  match_number: string;
  sort_order: string;
};

type ParsedStumpsData = {
  teamAName?: string;
  teamBName?: string;
  resultSummary?: string;
  playerOfMatch?: string;
  tournamentTitle?: string;
  matchTitle?: string;
  venue?: string;
  matchDatetimeLocal?: string;
  keyPlayers?: string;
  status?: string;
};

const emptyForm: MatchForm = {
  tournament_id: "",
  team_a_id: "",
  team_b_id: "",
  title: "",
  match_datetime: "",
  venue: "",
  status: "upcoming",
  result_summary: "",
  player_of_match: "",
  key_players: "",
  scorecard_pdf_url: "",
  external_score_url: "",
  is_featured_home: false,
  match_number: "",
  sort_order: "0",
};

function formatError(error: unknown) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "pdf";
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function formatMatchDate(value: string | null | undefined) {
  if (!value) return "Date not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function normalizeName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestTournamentIdByTitle(
  tournamentTitle: string | undefined,
  tournaments: TournamentRow[],
) {
  if (!tournamentTitle) return "";
  const normalizedTarget = normalizeName(tournamentTitle);

  const exact = tournaments.find(
    (item) => normalizeName(item.title) === normalizedTarget,
  );
  if (exact) return exact.id;

  const contains = tournaments.find((item) => {
    const name = normalizeName(item.title);
    return name.includes(normalizedTarget) || normalizedTarget.includes(name);
  });

  return contains?.id || "";
}

function findBestTeamIdByName(teamName: string | undefined, teams: TeamRow[]) {
  if (!teamName) return "";
  const normalizedTarget = normalizeName(teamName);

  const exact = teams.find(
    (item) => normalizeName(item.name) === normalizedTarget,
  );
  if (exact) return exact.id;

  const contains = teams.find((item) => {
    const name = normalizeName(item.name);
    return name.includes(normalizedTarget) || normalizedTarget.includes(name);
  });
  if (contains) return contains.id;

  const tokenMatch = teams.find((item) => {
    const name = normalizeName(item.name);
    const targetWords = normalizedTarget.split(" ").filter(Boolean);
    const matchedWords = targetWords.filter(
      (word) => word.length > 2 && name.includes(word),
    );
    return matchedWords.length >= Math.min(2, targetWords.length);
  });

  return tokenMatch?.id || "";
}

function toTitleCaseName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanStumpsMatchTitle(value: string | null | undefined) {
  return (value || "")
    .replace(/^s\s+/i, "")
    .replace(
      /app\s*store\s*match\s*report\s*created\s*from\s*stumps\s*match\s*report/gi,
      "",
    )
    .replace(/stumps\s*match\s*report/gi, "")
    .replace(/match\s*report/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCleanMatchTitle(
  teamAName?: string,
  teamBName?: string,
  fallbackTitle?: string | null,
) {
  const a = toTitleCaseName(teamAName);
  const b = toTitleCaseName(teamBName);
  if (a && b) return `${a} vs ${b}`;

  const cleaned = cleanStumpsMatchTitle(fallbackTitle);
  if (cleaned) {
    const parts = cleaned.split(/\s+vs\s+/i);
    if (parts.length >= 2) {
      return `${toTitleCaseName(parts[0])} vs ${toTitleCaseName(parts.slice(1).join(" vs "))}`;
    }
    return cleaned;
  }

  return "";
}

function extractKeyPlayersFromStumpsText(
  clean: string,
  playerOfMatch?: string,
) {
  const snippets: string[] = [];

  if (playerOfMatch) {
    snippets.push(playerOfMatch.trim());
  }

  const battingMatches = [
    ...clean.matchAll(
      /([A-Za-z][A-Za-z\s'.-]{2,35})\s+(\d{2,3})\*?\s*\(\s*(\d{1,3})\s*\)/g,
    ),
  ];

  battingMatches.forEach((match) => {
    const name = match[1].trim().replace(/\s+/g, " ");
    const runs = match[2];
    const balls = match[3];
    const text = `${name} ${runs}(${balls})`;
    if (
      !snippets.some((item) =>
        normalizeName(item).includes(normalizeName(name)),
      )
    ) {
      snippets.push(text);
    }
  });

  const bowlingMatches = [
    ...clean.matchAll(/([A-Za-z][A-Za-z\s'.-]{2,35})\s+(\d{1,2})-(\d{1,3})/g),
  ];

  bowlingMatches.forEach((match) => {
    const name = match[1].trim().replace(/\s+/g, " ");
    const wickets = match[2];
    const runs = match[3];
    const text = `${name} ${wickets}-${runs}`;
    if (
      !snippets.some((item) =>
        normalizeName(item).includes(normalizeName(name)),
      )
    ) {
      snippets.push(text);
    }
  });

  return snippets.slice(0, 5).join(", ");
}

function getRowDisplayTitle(row: MatchRow, teamMap: Map<string, TeamRow>) {
  const teamA = row.team_a_id ? teamMap.get(row.team_a_id) : null;
  const teamB = row.team_b_id ? teamMap.get(row.team_b_id) : null;

  const cleanTeamTitle = buildCleanMatchTitle(
    teamA?.name || "",
    teamB?.name || "",
    "",
  );
  if (cleanTeamTitle) return cleanTeamTitle;

  return cleanStumpsMatchTitle(row.title) || row.title || "Untitled Match";
}

function extractStumpsSummary(text: string): ParsedStumpsData {
  const clean = text.replace(/\r/g, " ").replace(/\s+/g, " ").trim();

  const tournamentMatch = clean.match(/Tournament\s+(.+?)\s+Club\s+/i);
  const matchTitleMatch = clean.match(/Match Title\s+(.+?)\s+Match Format\s+/i);
  const venueMatch = clean.match(/Venue\s+(.+?)\s+Date\s*&\s*Time\s+/i);
  const dateTimeMatch = clean.match(/Date\s*&\s*Time\s+(.+?)\s+Toss\s+/i);
  const resultMatch = clean.match(/Result\s+(.+?)\s+Player Of The Match\s+/i);
  const pomMatch = clean.match(
    /Player Of The Match\s+(.+?)\s+Match Information\s+/i,
  );

  const inningsMatches = [
    ...clean.matchAll(
      /([A-Z][A-Z\s&.-]+?)\s+(\d+-\d+)\s+in\s+([\d.]+)\s+overs/gi,
    ),
  ];
  const teamAName = inningsMatches[0]?.[1]?.trim() || "";
  const teamBName = inningsMatches[1]?.[1]?.trim() || "";

  const autoMatchTitle = buildCleanMatchTitle(
    teamAName,
    teamBName,
    matchTitleMatch?.[1]?.trim() || "",
  );

  const detectedPlayerOfMatch = pomMatch?.[1]?.trim() || undefined;
  const keyPlayers = extractKeyPlayersFromStumpsText(
    clean,
    detectedPlayerOfMatch,
  );

  let matchDatetimeLocal = "";
  if (dateTimeMatch?.[1]) {
    const raw = dateTimeMatch[1].trim();
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      matchDatetimeLocal = toDatetimeLocalValue(parsed.toISOString());
    }
  }

  return {
    teamAName: teamAName || undefined,
    teamBName: teamBName || undefined,
    resultSummary: resultMatch?.[1]?.trim() || undefined,
    playerOfMatch: detectedPlayerOfMatch,
    tournamentTitle: tournamentMatch?.[1]?.trim() || undefined,
    matchTitle: autoMatchTitle || undefined,
    venue: venueMatch?.[1]?.trim() || undefined,
    matchDatetimeLocal: matchDatetimeLocal || undefined,
    keyPlayers: keyPlayers || undefined,
    status: resultMatch?.[1] ? "completed" : undefined,
  };
}

async function extractTextFromPdfFirstPage(file: File) {
  const pdfjsLib = await import("pdfjs-dist");
  const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();

  const text = content.items
    .map((item: any) => ("str" in item ? item.str : ""))
    .join(" ");

  return text;
}

export default function AdminMatchesPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [form, setForm] = useState<MatchForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingScorecard, setUploadingScorecard] = useState(false);
  const [parsingScorecard, setParsingScorecard] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    loadMatches(selectedTournamentId);
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
        .select("id, name, slug")
        .order("name", { ascending: true }),
    ]);

    if (tournamentsRes.error || teamsRes.error) {
      const err = tournamentsRes.error || teamsRes.error;
      setMessage(`Failed to load setup data. ${formatError(err)}`);
      setMessageType("error");
      setLoadingSetup(false);
      return;
    }

    const tournamentRows = (tournamentsRes.data || []) as TournamentRow[];
    const teamRows = (teamsRes.data || []) as TeamRow[];

    setTournaments(tournamentRows);
    setTeams(teamRows);

    if (tournamentRows.length > 0) {
      setSelectedTournamentId((prev) => prev || tournamentRows[0].id);
      setForm((prev) => ({
        ...prev,
        tournament_id: prev.tournament_id || tournamentRows[0].id,
      }));
    }

    setLoadingSetup(false);
  }

  async function loadMatches(tournamentId?: string) {
    setLoadingMatches(true);

    let query = supabase
      .from("matches")
      .select("*")
      .order("match_number", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true })
      .order("match_datetime", { ascending: true });

    if (tournamentId) {
      query = query.eq("tournament_id", tournamentId);
    }

    const { data, error } = await query;

    if (error) {
      setMatches([]);
      setMessage(`Failed to load matches. ${formatError(error)}`);
      setMessageType("error");
      setLoadingMatches(false);
      return;
    }

    setMatches((data || []) as MatchRow[]);
    setLoadingMatches(false);
  }

  function resetForm(tournamentId?: string) {
    setEditingId(null);
    setForm({
      ...emptyForm,
      tournament_id: tournamentId || selectedTournamentId || "",
    });
    setMessage("");
    setMessageType("");
  }

  async function handleScorecardPdfUpload(file: File) {
    try {
      setUploadingScorecard(true);
      setParsingScorecard(true);
      setMessage("");
      setMessageType("");

      const fileExt = getFileExtension(file.name);
      const fileName = `scorecard-${Date.now()}.${fileExt}`;
      const filePath = `matches/scorecards/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filePath);

      const pdfText = await extractTextFromPdfFirstPage(file);
      const parsed = extractStumpsSummary(pdfText);

      const detectedTournamentId =
        findBestTournamentIdByTitle(parsed.tournamentTitle, tournaments) ||
        form.tournament_id;

      const detectedTeamAId = findBestTeamIdByName(parsed.teamAName, teams);
      const detectedTeamBId = findBestTeamIdByName(parsed.teamBName, teams);

      setSelectedTournamentId(detectedTournamentId || selectedTournamentId);

      const teamANameFromDb = detectedTeamAId
        ? teams.find((team) => team.id === detectedTeamAId)?.name ||
          parsed.teamAName
        : parsed.teamAName;
      const teamBNameFromDb = detectedTeamBId
        ? teams.find((team) => team.id === detectedTeamBId)?.name ||
          parsed.teamBName
        : parsed.teamBName;
      const cleanMatchTitle = buildCleanMatchTitle(
        teamANameFromDb,
        teamBNameFromDb,
        parsed.matchTitle || form.title,
      );

      setForm((prev) => ({
        ...prev,
        tournament_id: detectedTournamentId || prev.tournament_id,
        team_a_id: detectedTeamAId || prev.team_a_id,
        team_b_id: detectedTeamBId || prev.team_b_id,
        title: cleanMatchTitle || prev.title,
        match_datetime: parsed.matchDatetimeLocal || prev.match_datetime,
        venue: parsed.venue || prev.venue,
        status: parsed.status || "completed",
        result_summary: parsed.resultSummary || prev.result_summary,
        player_of_match: parsed.playerOfMatch || prev.player_of_match,
        key_players: parsed.keyPlayers || prev.key_players,
        scorecard_pdf_url: data.publicUrl,
      }));

      setMessage(
        "Scorecard uploaded. Match details were auto-filled from the STUMPS summary page.",
      );
      setMessageType("success");
    } catch (error) {
      setMessage(`Failed to upload/parse scorecard PDF. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setUploadingScorecard(false);
      setParsingScorecard(false);
    }
  }

  async function handleSave() {
    if (!form.tournament_id) {
      setMessage("Please select a tournament.");
      setMessageType("error");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Please enter a match title.");
      setMessageType("error");
      return;
    }

    if (form.status === "completed" && !form.scorecard_pdf_url) {
      setMessage("For completed matches, please upload the scorecard PDF.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    const payload = {
      tournament_id: form.tournament_id,
      team_a_id: form.team_a_id || null,
      team_b_id: form.team_b_id || null,
      title: form.title.trim() || null,
      match_datetime: form.match_datetime
        ? new Date(form.match_datetime).toISOString()
        : null,
      venue: form.venue.trim() || null,
      status: form.status || "upcoming",
      result_summary: form.result_summary.trim() || null,
      player_of_match: form.player_of_match.trim() || null,
      key_players: form.key_players.trim() || null,
      scorecard_pdf_url: form.scorecard_pdf_url.trim() || null,
      external_score_url: form.external_score_url.trim() || null,
      is_featured_home: !!form.is_featured_home,
      match_number: form.match_number === "" ? null : Number(form.match_number) || null,
      sort_order: form.sort_order === "" ? 0 : Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("matches")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage("Match updated successfully.");
      } else {
        const { error } = await supabase.from("matches").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        setMessage("Match created successfully.");
      }

      setMessageType("success");
      await loadMatches(form.tournament_id);
      resetForm(form.tournament_id);
    } catch (error) {
      setMessage(`Failed to save match. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: MatchRow) {
    setEditingId(row.id);
    setForm({
      tournament_id: row.tournament_id || "",
      team_a_id: row.team_a_id || "",
      team_b_id: row.team_b_id || "",
      title: row.title || "",
      match_datetime: toDatetimeLocalValue(row.match_datetime),
      venue: row.venue || "",
      status: row.status || "upcoming",
      result_summary: row.result_summary || "",
      player_of_match: row.player_of_match || "",
      key_players: row.key_players || "",
      scorecard_pdf_url: row.scorecard_pdf_url || "",
      external_score_url: row.external_score_url || "",
      is_featured_home: !!row.is_featured_home,
      match_number: row.match_number?.toString() ?? "",
      sort_order: row.sort_order?.toString() ?? "0",
    });
    setSelectedTournamentId(row.tournament_id || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this match?");
    if (!ok) return;

    setDeletingId(id);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;

      setMessage("Match deleted successfully.");
      setMessageType("success");

      if (editingId === id) {
        resetForm(selectedTournamentId);
      }

      await loadMatches(selectedTournamentId);
    } catch (error) {
      setMessage(`Failed to delete match. ${formatError(error)}`);
      setMessageType("error");
    } finally {
      setDeletingId(null);
    }
  }

  const teamMap = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Match Center
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Create upcoming fixtures and completed match results.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Upcoming matches are simple title-based entries. Completed matches
            should use the STUMPS scorecard PDF upload for structured auto-fill.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Admin Matches
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {editingId ? "Edit Match" : "Create Match"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                For completed matches, upload the scorecard PDF and let the
                system fill the summary. For upcoming matches, just type the
                match title manually.
              </p>
            </div>

            <button
              type="button"
              onClick={() => resetForm(selectedTournamentId)}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Form
            </button>
          </div>

          {message ? (
            <div
              className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
                messageType === "error"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {message}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <FieldSelect
              label="Tournament"
              value={form.tournament_id}
              onChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  tournament_id: value,
                }));
                setSelectedTournamentId(value);
              }}
              options={[
                { value: "", label: "Select Tournament" },
                ...tournaments.map((item) => ({
                  value: item.id,
                  label: item.title || "Untitled Tournament",
                })),
              ]}
            />

            <Field
              label="Match Header"
              value={form.title}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
              placeholder="Plaza Spartan vs SGH Lions"
            />

            <Field
              label="Match Date & Time"
              type="datetime-local"
              value={form.match_datetime}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, match_datetime: value }))
              }
            />

            <Field
              label="Venue"
              value={form.venue}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, venue: value }))
              }
              placeholder="Al-Azhar"
            />

            <FieldSelect
              label="Status"
              value={form.status}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, status: value }))
              }
              options={[
                { value: "upcoming", label: "Upcoming" },
                { value: "live", label: "Live" },
                { value: "completed", label: "Completed" },
              ]}
            />

            <Field
              label="Match No."
              type="number"
              value={form.match_number}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, match_number: value }))
              }
              placeholder="1"
            />

            <Field
              label="Sort Order (optional internal order)"
              type="number"
              value={form.sort_order}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, sort_order: value }))
              }
              placeholder="0"
            />

            {form.status === "completed" && (
              <>
                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Upload the STUMPS match report PDF. The form will auto-fill
                    the teams, match title, result summary, player of the match,
                    venue, and key players.
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Scorecard PDF Upload
                  </label>

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleScorecardPdfUpload(file);
                      }
                    }}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    {uploadingScorecard
                      ? "Uploading PDF..."
                      : parsingScorecard
                        ? "Reading STUMPS summary page..."
                        : form.scorecard_pdf_url
                          ? "PDF uploaded and linked"
                          : "Upload full scorecard PDF"}
                  </p>

                  {form.scorecard_pdf_url ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <a
                        href={form.scorecard_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        Open uploaded scorecard
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            scorecard_pdf_url: "",
                          }))
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>

                <Field
                  label="STUMP / External Score Link"
                  value={form.external_score_url}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, external_score_url: value }))
                  }
                  placeholder="https://..."
                />

                <div className="md:col-span-2">
                  <FieldTextarea
                    label="Result Summary"
                    value={form.result_summary}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, result_summary: value }))
                    }
                    placeholder="INDIA BLUE won by 7 wickets"
                    rows={3}
                  />
                </div>

                <Field
                  label="Player of the Match"
                  value={form.player_of_match}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, player_of_match: value }))
                  }
                  placeholder="Mutahhar Husain"
                />

                <Field
                  label="Key Players"
                  value={form.key_players}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, key_players: value }))
                  }
                  placeholder="Waheed 47(26), Saqib Yaseen 21*(10), Arshad Raza 2-16"
                />
              </>
            )}

            <div className="md:col-span-2">
              <label className="mt-1 flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_featured_home}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_featured_home: e.target.checked,
                    }))
                  }
                />
                Feature this match on homepage
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              saving || loadingSetup || uploadingScorecard || parsingScorecard
            }
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Match" : "Create Match"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Existing Matches
              </p>
              <h2 className="mt-2 text-2xl font-bold">Tournament Match List</h2>
            </div>

            <div className="w-full md:w-72">
              <FieldSelect
                label="Filter by Tournament"
                value={selectedTournamentId}
                onChange={(value) => {
                  setSelectedTournamentId(value);
                  setForm((prev) => ({
                    ...prev,
                    tournament_id: value || prev.tournament_id,
                  }));
                }}
                options={[
                  { value: "", label: "All Tournaments" },
                  ...tournaments.map((item) => ({
                    value: item.id,
                    label: item.title || "Untitled Tournament",
                  })),
                ]}
              />
            </div>
          </div>

          {loadingMatches || loadingSetup ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              Loading matches...
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
              No matches found.
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((row) => {
                const teamA = row.team_a_id ? teamMap.get(row.team_a_id) : null;
                const teamB = row.team_b_id ? teamMap.get(row.team_b_id) : null;

                return (
                  <div
                    key={row.id}
                    className="rounded-3xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow-sm">
                            {row.match_number ? `Match ${row.match_number}` : "Match No. not set"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {(row.status || "upcoming").toUpperCase()}
                          </span>
                          {row.is_featured_home ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Homepage Featured
                            </span>
                          ) : null}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900">
                          {getRowDisplayTitle(row, teamMap)}
                        </h3>

                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">
                            Date:
                          </span>{" "}
                          {formatMatchDate(row.match_datetime)}
                        </p>

                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">
                            Venue:
                          </span>{" "}
                          {row.venue || "Not set"}
                        </p>

                        {row.status === "completed" ? (
                          <>
                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-slate-900">
                                Result:
                              </span>{" "}
                              {row.result_summary || "Not updated"}
                            </p>

                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-slate-900">
                                Player of the Match:
                              </span>{" "}
                              {row.player_of_match || "Not updated"}
                            </p>

                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-slate-900">
                                Key Players:
                              </span>{" "}
                              {row.key_players || "Not updated"}
                            </p>
                          </>
                        ) : null}

                        <div className="flex flex-wrap gap-3 pt-2">
                          {row.scorecard_pdf_url ? (
                            <a
                              href={row.scorecard_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View Scorecard PDF
                            </a>
                          ) : null}

                          {row.external_score_url ? (
                            <a
                              href={row.external_score_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Open STUMP / Score Link
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === row.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      >
        {options.map((item) => (
          <option key={`${label}-${item.value || "blank"}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
