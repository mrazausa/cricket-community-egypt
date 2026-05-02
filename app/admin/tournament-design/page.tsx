"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import AdminNav from "@/components/admin/admin-nav";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

type TournamentForm = {
  id?: string;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  timeline?: string | null;
  overview?: string | null;
  logo_url?: string | null;
  venue?: string | null;
  format?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_featured_home?: boolean | null;
  hero_title_font_mobile?: number | null;
  hero_title_font_desktop?: number | null;
  hero_title_max_width?: number | null;
  hero_title_align?: string | null;
  hero_logo_size_mobile?: number | null;
  hero_logo_size_desktop?: number | null;
  hero_logo_top_margin?: number | null;
  hero_subtitle_font_mobile?: number | null;
  hero_subtitle_font_desktop?: number | null;
  hero_subtitle_max_width?: number | null;
  hero_youtube_url?: string | null;
  hero_youtube_autoplay?: boolean | null;
  hero_banner_url?: string | null;
  hero_media_mode?: string | null;
};

type CsvPlayerStat = {
  playerName: string;
  teamName: string;
  matches: number;
  pomAwards: number;
  runs: number;
  battingAvg: number;
  battingSr: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  threeWkts: number;
  fiveWkts: number;
  bowlingAvg: number;
  economy: number;
  catches: number;
  stumpings: number;
  runOuts: number;
};

type PerformerInsert = {
  tournament_id: string;
  player_name: string;
  team_name: string | null;
  player_photo_url: string | null;
  award_category: string;
  stat_line: string | null;
  rating: number;
  rank: number;
  is_active: boolean;
  show_on_tournament_page: boolean;
  sort_order: number;
};

type ExistingPerformer = {
  id: string;
  player_name: string;
  team_name: string | null;
  award_category: string | null;
  stat_line: string | null;
  rating: number | null;
  rank: number | null;
  sort_order: number | null;
  is_active: boolean | null;
  show_on_tournament_page: boolean | null;
};

const emptyForm: TournamentForm = {
  status: "upcoming",
  is_featured_home: false,
  hero_title_align: "center",
  hero_media_mode: "banner",
  hero_youtube_autoplay: false,
};

const awardCategories = [
  "Best Player / MVP",
  "Most Runs",
  "Best Batsman",
  "Most Wickets",
  "Best Bowler",
  "Best All Rounder",
  "Best Wicket Keeper",
  "Best Fielder",
  "POM Leader",
];

function getYoutubeEmbedUrl(url?: string | null, autoplay = false) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    let videoId = parsed.searchParams.get("v") || "";

    if (!videoId && parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "").split("/")[0] || "";
    }

    if (!videoId && parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
    }

    if (!videoId && parsed.pathname.includes("/shorts/")) {
      videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    }

    if (!videoId && parsed.pathname.includes("/live/")) {
      videoId = parsed.pathname.split("/live/")[1]?.split("/")[0] || "";
    }

    if (!videoId) return "";

    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
    });

    if (autoplay) {
      params.set("autoplay", "1");
      params.set("mute", "1");
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  } catch {
    return "";
  }
}

function toNumber(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/\ufeff/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

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
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsvText(text: string) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headerIndex = lines.findIndex((line) => {
  const normalized = parseCsvLine(line).map(normalizeHeader);
  return normalized.includes("playername") && normalized.includes("teamname");
});

if (headerIndex < 0) return [];

const headers = parseCsvLine(lines[headerIndex]).map(normalizeHeader);

  const getValue = (row: string[], possibleHeaders: string[]) => {
    for (const header of possibleHeaders) {
      const index = headers.indexOf(normalizeHeader(header));
      if (index >= 0) return row[index] || "";
    }
    return "";
  };

  return lines.slice(headerIndex + 1).map((line) => {
    const row = parseCsvLine(line);

    return {
      playerName: getValue(row, ["Player Name", "Player", "Name"]),
      teamName: getValue(row, ["Team Name", "Team", "Club"]),
      matches: toNumber(getValue(row, ["Matches", "Mat", "M"])),
      pomAwards: toNumber(getValue(row, ["POM Awards", "POM", "Player of Match", "Player of the Match"])),
      runs: toNumber(getValue(row, ["Runs Scored", "Runs", "R"])),
      battingAvg: toNumber(getValue(row, ["Batting Avg", "Bat Avg", "Average", "Avg"])),
      battingSr: toNumber(getValue(row, ["Bat SR", "Strike Rate", "SR", "Batting Strike Rate"])),
      fifties: toNumber(getValue(row, ["50s", "50", "Fifties", "Half Centuries"])),
      hundreds: toNumber(getValue(row, ["100s", "100", "Hundreds", "Centuries"])),
      wickets: toNumber(getValue(row, ["Wickets", "Wkts", "W"])),
      threeWkts: toNumber(getValue(row, ["3 Wkts", "3Wkts", "3 Wickets", "Three Wickets"])),
      fiveWkts: toNumber(getValue(row, ["5 Wkts", "5Wkts", "5 Wickets", "Five Wickets"])),
      bowlingAvg: toNumber(getValue(row, ["Bowl Avg", "Bowling Avg", "Bowling Average"])),
      economy: toNumber(getValue(row, ["Economy", "Eco", "Econ"])),
      catches: toNumber(getValue(row, ["Catches", "Ct"])),
      stumpings: toNumber(getValue(row, ["Stumpings", "St"])),
      runOuts: toNumber(getValue(row, ["Run Outs", "Runouts", "RO"])),
    } as CsvPlayerStat;
  }).filter((item) => item.playerName.trim().length > 0);
}

function roundScore(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function battingPoints(player: CsvPlayerStat) {
  return (
    (player.runs >= 10 ? player.runs / 10 : 0) +
    player.fifties +
    player.hundreds +
    (player.runs >= 10 && player.battingSr >= 130 ? 1 : 0)
  );
}

function bowlingPoints(player: CsvPlayerStat) {
  return player.wickets * 2 + player.threeWkts + player.fiveWkts;
}

function fieldingPoints(player: CsvPlayerStat) {
  return player.catches + player.stumpings + player.runOuts;
}

function calculateStumpsMvpPoints(player: CsvPlayerStat) {
  return battingPoints(player) + bowlingPoints(player) + fieldingPoints(player);
}

function rankPlayers(
  players: CsvPlayerStat[],
  scoreFn: (player: CsvPlayerStat) => number,
  tieBreakers: ((a: CsvPlayerStat, b: CsvPlayerStat) => number)[] = [],
  limit = 3
) {
  return [...players]
    .map((player) => ({ player, score: scoreFn(player) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      for (const tieBreaker of tieBreakers) {
        const diff = tieBreaker(a.player, b.player);
        if (diff !== 0) return diff;
      }

      return a.player.playerName.localeCompare(b.player.playerName);
    })
    .slice(0, limit);
}

function buildPerformersFromStats(tournamentId: string, players: CsvPlayerStat[]) {
  const inserts: PerformerInsert[] = [];

  const addAward = (
    category: string,
    rows: { player: CsvPlayerStat; score: number; statLine: string }[],
    baseSort: number
  ) => {
    rows.forEach((row, index) => {
      inserts.push({
        tournament_id: tournamentId,
        player_name: row.player.playerName,
        team_name: row.player.teamName || null,
        player_photo_url: null,
        award_category: category,
        stat_line: row.statLine,
        rating: roundScore(row.score),
        rank: index + 1,
        is_active: true,
        show_on_tournament_page: true,
        sort_order: baseSort + index,
      });
    });
  };

  const mvpRows = rankPlayers(
    players,
    calculateStumpsMvpPoints,
    [
      (a, b) => battingPoints(b) - battingPoints(a),
      (a, b) => bowlingPoints(b) - bowlingPoints(a),
      (a, b) => fieldingPoints(b) - fieldingPoints(a),
    ],
    3
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `Bat ${roundScore(battingPoints(player), 1)} • Bowl ${roundScore(bowlingPoints(player), 1)} • Field ${roundScore(fieldingPoints(player), 1)}`,
  }));

  const mostRunsRows = rankPlayers(
    players,
    (p) => p.runs,
    [
      (a, b) => b.battingAvg - a.battingAvg,
      (a, b) => b.battingSr - a.battingSr,
    ],
    3
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `${player.runs} runs • Avg ${player.battingAvg || 0} • SR ${player.battingSr || 0}`,
  }));

  const bestBatsmanRows = rankPlayers(
    players,
    battingPoints,
    [
      (a, b) => b.runs - a.runs,
      (a, b) => b.battingAvg - a.battingAvg,
      (a, b) => b.battingSr - a.battingSr,
    ],
    3
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `Bat points ${roundScore(score, 1)} • ${player.runs} runs • Avg ${player.battingAvg || 0} • SR ${player.battingSr || 0}`,
  }));

  const mostWicketsRows = rankPlayers(
    players,
    (p) => p.wickets,
    [
      (a, b) => (a.economy || 99) - (b.economy || 99),
      (a, b) => bowlingPoints(b) - bowlingPoints(a),
    ],
    3
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `${player.wickets} wickets • Economy ${player.economy || 0} • Bowl Avg ${player.bowlingAvg || 0}`,
  }));

  const bestBowlerRows = rankPlayers(
    players,
    bowlingPoints,
    [
      (a, b) => b.wickets - a.wickets,
      (a, b) => (a.economy || 99) - (b.economy || 99),
    ],
    3
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `Bowl points ${roundScore(score, 1)} • ${player.wickets} wickets • Economy ${player.economy || 0}`,
  }));

  const allRoundRows = rankPlayers(
    players.filter((p) => p.runs >= 10 && p.wickets >= 1),
    (p) => battingPoints(p) + bowlingPoints(p) + fieldingPoints(p),
    [
      (a, b) => bowlingPoints(b) - bowlingPoints(a),
      (a, b) => battingPoints(b) - battingPoints(a),
    ],
    3
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `${player.runs} runs • ${player.wickets} wickets • ${fieldingPoints(player)} fielding pts`,
  }));

  const keeperRows = rankPlayers(
    players,
    (p) => p.stumpings * 2 + p.catches,
    [(a, b) => b.stumpings - a.stumpings, (a, b) => b.catches - a.catches],
    2
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `${player.catches} catches • ${player.stumpings} stumpings`,
  }));

  const fielderRows = rankPlayers(
    players,
    (p) => p.catches + p.runOuts,
    [(a, b) => b.catches - a.catches, (a, b) => b.runOuts - a.runOuts],
    2
  ).map(({ player, score }) => ({
    player,
    score,
    statLine: `${player.catches} catches • ${player.runOuts} run outs`,
  }));

  const pomRows = rankPlayers(players, (p) => p.pomAwards, [(a, b) => calculateStumpsMvpPoints(b) - calculateStumpsMvpPoints(a)], 2).map(({ player, score }) => ({
    player,
    score,
    statLine: `${player.pomAwards} Player of the Match awards`,
  }));

  addAward("Best Player / MVP", mvpRows, 1);
  addAward("Most Runs", mostRunsRows, 20);
  addAward("Best Batsman", bestBatsmanRows, 40);
  addAward("Most Wickets", mostWicketsRows, 60);
  addAward("Best Bowler", bestBowlerRows, 80);
  addAward("Best All Rounder", allRoundRows, 100);
  addAward("Best Wicket Keeper", keeperRows, 120);
  addAward("Best Fielder", fielderRows, 140);
  addAward("POM Leader", pomRows, 160);

  return inserts;
}

export default function TournamentDesignAdmin() {
  const [tournaments, setTournaments] = useState<TournamentForm[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [performers, setPerformers] = useState<ExistingPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvSummary, setCsvSummary] = useState("");
  const [message, setMessage] = useState("");
  const [editingPerformer, setEditingPerformer] = useState<ExistingPerformer | null>(null);
  const [updatingPerformer, setUpdatingPerformer] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadPerformers(selectedId);
    } else {
      setPerformers([]);
    }
  }, [selectedId]);

  const selectedTournament = useMemo(
    () => tournaments.find((item) => item.id === selectedId) || null,
    [selectedId, tournaments]
  );

  const groupedPerformers = useMemo(() => {
    return awardCategories
      .map((category) => ({
        category,
        rows: performers.filter((item) => (item.award_category || "") === category),
      }))
      .filter((group) => group.rows.length > 0);
  }, [performers]);

  async function loadTournaments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to load tournaments: ${error.message}`);
      setTournaments([]);
    } else {
      setTournaments((data || []) as TournamentForm[]);
    }

    setLoading(false);
  }

  async function loadPerformers(tournamentId: string) {
    const { data, error } = await supabase
      .from("tournament_top_performers")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("rank", { ascending: true });

    if (!error) {
      setPerformers((data || []) as ExistingPerformer[]);
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    const selected = tournaments.find((item) => item.id === id);
    setForm(selected ? { ...emptyForm, ...selected } : emptyForm);
    setCsvSummary("");
    setMessage("");
  }

  function updateField<K extends keyof TournamentForm>(key: K, value: TournamentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadHeroBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;

    setUploading(true);
    setMessage("");

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `tournament-hero/${selectedId}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("tournament-assets")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from("tournament-assets").getPublicUrl(filePath);
      updateField("hero_banner_url", data.publicUrl);
      updateField("hero_media_mode", "banner");
      setMessage("Hero banner uploaded. Click Save Tournament Settings to publish it.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown upload error";
      setMessage(`Upload failed: ${text}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function importTopPerformersFromCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;

    setImportingCsv(true);
    setMessage("");
    setCsvSummary("");

    try {
      const text = await file.text();
      const stats = parseCsvText(text);

      if (stats.length === 0) {
        throw new Error("CSV has no player rows or headers are not recognized.");
      }

      const rows = buildPerformersFromStats(selectedId, stats);

      if (rows.length === 0) {
        throw new Error("CSV parsed successfully, but no performer ranking rows could be calculated.");
      }

      const { error: deleteError } = await supabase
        .from("tournament_top_performers")
        .delete()
        .eq("tournament_id", selectedId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from("tournament_top_performers").insert(rows);

      if (insertError) throw insertError;

      setCsvSummary(`Imported ${rows.length} performer rows from ${stats.length} player stats.`);
      setMessage("CSV imported successfully. Tournament Top Performers updated.");
      await loadPerformers(selectedId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown CSV import error";
      setMessage(`CSV import failed: ${text}`);
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  async function deletePerformer(id: string) {
    if (!window.confirm("Delete this top performer row?")) return;

    const { error } = await supabase.from("tournament_top_performers").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    setMessage("Top performer row deleted.");
    if (selectedId) await loadPerformers(selectedId);
  }

  async function updatePerformer() {
    if (!editingPerformer) return;

    setUpdatingPerformer(true);
    setMessage("");

    const payload = {
      award_category: editingPerformer.award_category || null,
      player_name: editingPerformer.player_name || "",
      team_name: editingPerformer.team_name || null,
      stat_line: editingPerformer.stat_line || null,
      rating: Number(editingPerformer.rating || 0),
      rank: Number(editingPerformer.rank || 1),
      sort_order: Number(editingPerformer.sort_order || 1),
      is_active: editingPerformer.is_active === true,
      show_on_tournament_page: editingPerformer.show_on_tournament_page === true,
    };

    const { error } = await supabase
      .from("tournament_top_performers")
      .update(payload)
      .eq("id", editingPerformer.id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      setUpdatingPerformer(false);
      return;
    }

    setMessage("Top performer row updated successfully.");
    setEditingPerformer(null);
    setUpdatingPerformer(false);
    if (selectedId) await loadPerformers(selectedId);
  }

  function updateEditingPerformer<K extends keyof ExistingPerformer>(key: K, value: ExistingPerformer[K]) {
    setEditingPerformer((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title || null,
      slug: form.slug || null,
      status: form.status || "upcoming",
      timeline: form.timeline || null,
      overview: form.overview || null,
      logo_url: form.logo_url || null,
      venue: form.venue || null,
      format: form.format || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_featured_home: form.is_featured_home === true,
      hero_title_font_mobile: Number(form.hero_title_font_mobile || 32),
      hero_title_font_desktop: Number(form.hero_title_font_desktop || 60),
      hero_title_max_width: Number(form.hero_title_max_width || 900),
      hero_title_align: form.hero_title_align || "center",
      hero_logo_size_mobile: Number(form.hero_logo_size_mobile || 120),
      hero_logo_size_desktop: Number(form.hero_logo_size_desktop || 200),
      hero_logo_top_margin: Number(form.hero_logo_top_margin || 10),
      hero_subtitle_font_mobile: Number(form.hero_subtitle_font_mobile || 16),
      hero_subtitle_font_desktop: Number(form.hero_subtitle_font_desktop || 18),
      hero_subtitle_max_width: Number(form.hero_subtitle_max_width || 720),
      hero_youtube_url: form.hero_youtube_url || null,
      hero_youtube_autoplay: form.hero_youtube_autoplay === true,
      hero_banner_url: form.hero_banner_url || null,
      hero_media_mode: form.hero_media_mode || "banner",
    };

    const { error } = await supabase.from("tournaments").update(payload).eq("id", selectedId);

    if (error) {
      setMessage(`Save failed: ${error.message}`);
    } else {
      setMessage("Tournament settings saved successfully.");
      await loadTournaments();
    }

    setSaving(false);
  }

  const embedUrl = getYoutubeEmbedUrl(form.hero_youtube_url, form.hero_youtube_autoplay === true);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Admin Panel
          </p>
          <h1 className="mt-2 text-3xl font-bold">Tournament Design Control</h1>
          <p className="mt-2 text-sm text-slate-600">
            Control tournament hero media, YouTube moments, static banner, tournament info, and CSV-based top performers.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              {message}
            </div>
          ) : null}

          <div className="mt-6">
            <label className="text-sm font-semibold text-slate-700">Select Tournament</label>
            <select
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold"
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">Select Tournament</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || t.slug || t.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading tournaments...
          </div>
        ) : null}

        {selectedTournament ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <AdminCard title="Tournament Info" eyebrow="Core">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Title" value={form.title || ""} onChange={(v) => updateField("title", v)} />
                  <Input label="Slug" value={form.slug || ""} onChange={(v) => updateField("slug", v)} />
                  <Input label="Timeline" value={form.timeline || ""} onChange={(v) => updateField("timeline", v)} />
                  <Input label="Venue" value={form.venue || ""} onChange={(v) => updateField("venue", v)} />
                  <Input label="Format" value={form.format || ""} onChange={(v) => updateField("format", v)} />
                  <Input label="Logo URL" value={form.logo_url || ""} onChange={(v) => updateField("logo_url", v)} />
                  <Input label="Start Date" type="date" value={form.start_date || ""} onChange={(v) => updateField("start_date", v)} />
                  <Input label="End Date" type="date" value={form.end_date || ""} onChange={(v) => updateField("end_date", v)} />
                </div>

                <label className="mt-4 block text-sm font-semibold text-slate-700">Overview</label>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  value={form.overview || ""}
                  onChange={(e) => updateField("overview", e.target.value)}
                />
              </AdminCard>

              <AdminCard title="Hero Media" eyebrow="YouTube or Banner">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Hero Media Mode</span>
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold"
                      value={form.hero_media_mode || "banner"}
                      onChange={(e) => updateField("hero_media_mode", e.target.value)}
                    >
                      <option value="banner">Static Banner</option>
                      <option value="youtube">YouTube Video</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    <input
                      type="checkbox"
                      checked={form.hero_youtube_autoplay === true}
                      onChange={(e) => updateField("hero_youtube_autoplay", e.target.checked)}
                    />
                    <span className="text-sm font-semibold text-slate-700">Autoplay YouTube video</span>
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input label="Hero YouTube URL" value={form.hero_youtube_url || ""} onChange={(v) => updateField("hero_youtube_url", v)} />
                  <Input label="Hero Banner Image URL" value={form.hero_banner_url || ""} onChange={(v) => updateField("hero_banner_url", v)} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                    {uploading ? "Uploading..." : "Upload Static Banner"}
                    <input type="file" accept="image/*" className="hidden" onChange={uploadHeroBanner} disabled={uploading} />
                  </label>
                  <p className="text-sm text-slate-500">Bucket: tournament-assets</p>
                </div>
              </AdminCard>

              <AdminCard title="STUMPS CSV Import" eyebrow="Tournament Top Performers">
                <p className="text-sm leading-6 text-slate-600">
                  Upload the tournament stats CSV from STUMPS. This replaces existing top performers for the selected tournament only and calculates MVP, Most Runs, Best Batsman, Most Wickets, Best Bowler, All-Rounder, Keeper, Fielder, and POM Leader.
                </p>

                {csvSummary ? (
                  <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    {csvSummary}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                    {importingCsv ? "Importing CSV..." : "Upload STUMPS CSV"}
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={importTopPerformersFromCsv} disabled={importingCsv} />
                  </label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selected tournament only
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Expected CSV columns</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Player Name, Team Name, Matches, POM Awards, Runs Scored, Batting Avg, Bat SR, 50s, 100s, Wickets, 3 Wkts, 5 Wkts, Bowl Avg, Economy, Catches, Stumpings, Run Outs.
                  </p>
                </div>
              </AdminCard>

              <AdminCard title="Imported Top Performers" eyebrow="Preview & Cleanup">
                {performers.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No tournament top performers imported yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedPerformers.map((group) => (
                      <div key={group.category} className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm">
                        <div className="flex flex-col gap-2 border-b border-slate-200 bg-white/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">Category Block</p>
                            <h3 className="mt-1 text-xl font-black text-slate-950">{group.category}</h3>
                          </div>
                          <span className="w-fit rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                            Top {group.rows.length}
                          </span>
                        </div>

                        <div className="grid gap-3 p-4">
                          {group.rows.map((item) => (
                            <div key={item.id} className="grid gap-4 rounded-3xl border border-white bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-md">
                                #{item.rank || "-"}
                              </div>

                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                  Rank {item.rank || "-"} • Rating {item.rating ?? 0}
                                </p>
                                <p className="mt-1 text-lg font-black text-slate-950">{item.player_name}</p>
                                <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">{item.team_name || "Team not set"}</p>
                                <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                                  {item.stat_line || "No stat line"}
                                </p>
                              </div>

                              <div className="flex gap-2 sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingPerformer({ ...item })}
                                  className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deletePerformer(item.id)}
                                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>

              <AdminCard title="Hero Typography" eyebrow="Design">
                <div className="grid gap-4 md:grid-cols-3">
                  <Input label="Title Mobile Size" type="number" value={String(form.hero_title_font_mobile || "")} onChange={(v) => updateField("hero_title_font_mobile", Number(v))} />
                  <Input label="Title Desktop Size" type="number" value={String(form.hero_title_font_desktop || "")} onChange={(v) => updateField("hero_title_font_desktop", Number(v))} />
                  <Input label="Title Max Width" type="number" value={String(form.hero_title_max_width || "")} onChange={(v) => updateField("hero_title_max_width", Number(v))} />
                  <Input label="Logo Mobile Size" type="number" value={String(form.hero_logo_size_mobile || "")} onChange={(v) => updateField("hero_logo_size_mobile", Number(v))} />
                  <Input label="Logo Desktop Size" type="number" value={String(form.hero_logo_size_desktop || "")} onChange={(v) => updateField("hero_logo_size_desktop", Number(v))} />
                  <Input label="Logo Top Margin" type="number" value={String(form.hero_logo_top_margin || "")} onChange={(v) => updateField("hero_logo_top_margin", Number(v))} />
                </div>

                <label className="mt-4 block text-sm font-semibold text-slate-700">Title Alignment</label>
                <select
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold"
                  value={form.hero_title_align || "center"}
                  onChange={(e) => updateField("hero_title_align", e.target.value)}
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </AdminCard>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !selectedId}
                className="h-14 w-full rounded-2xl bg-slate-950 px-6 text-base font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Tournament Settings"}
              </button>
            </div>

            <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200 lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Preview</p>
              <h2 className="mt-2 text-2xl font-bold">Hero Media Preview</h2>

              <div className="mt-5 overflow-hidden rounded-3xl bg-slate-950 p-3 text-white">
                {form.hero_media_mode === "youtube" && embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title="Tournament video preview"
                    className="aspect-video w-full rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : form.hero_banner_url || form.logo_url ? (
                  <img
                    src={form.hero_banner_url || form.logo_url || ""}
                    alt="Tournament hero preview"
                    className="max-h-[320px] w-full rounded-2xl object-contain"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-2xl bg-white/10 text-sm text-slate-300">
                    Add YouTube URL or banner image.
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm font-bold text-slate-900">CSV Awards</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {awardCategories.map((category) => (
                    <span key={category} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {editingPerformer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Edit Top Performer</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Fine Tune Performer Row</h3>
              </div>
              <button type="button" onClick={() => setEditingPerformer(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Award Category</span>
                <select value={editingPerformer.award_category || ""} onChange={(e) => updateEditingPerformer("award_category", e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500">
                  {awardCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
                </select>
              </label>
              <Input label="Player Name" value={editingPerformer.player_name || ""} onChange={(v) => updateEditingPerformer("player_name", v)} />
              <Input label="Team Name" value={editingPerformer.team_name || ""} onChange={(v) => updateEditingPerformer("team_name", v)} />
              <Input label="Rank" type="number" value={String(editingPerformer.rank || 1)} onChange={(v) => updateEditingPerformer("rank", Number(v))} />
              <Input label="Rating / MVP Points" type="number" value={String(editingPerformer.rating || 0)} onChange={(v) => updateEditingPerformer("rating", Number(v))} />
              <Input label="Sort Order" type="number" value={String(editingPerformer.sort_order || 1)} onChange={(v) => updateEditingPerformer("sort_order", Number(v))} />
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Stat Line</span>
              <textarea value={editingPerformer.stat_line || ""} onChange={(e) => updateEditingPerformer("stat_line", e.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500" />
            </label>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={editingPerformer.is_active === true} onChange={(e) => updateEditingPerformer("is_active", e.target.checked)} />Active Row</label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={editingPerformer.show_on_tournament_page === true} onChange={(e) => updateEditingPerformer("show_on_tournament_page", e.target.checked)} />Show on Public Tournament Page</label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditingPerformer(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={updatePerformer} disabled={updatingPerformer} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{updatingPerformer ? "Updating..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <SiteFooter />
    </main>
  );
}

function AdminCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="rounded-[30px] bg-white p-6 shadow-xl ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
      />
    </label>
  );
}
