"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

const MEDIA_BUCKET = "site-media";

type TournamentOption = {
  id: string;
  title: string | null;
  slug: string | null;
  status: string | null;
  is_featured_home?: boolean | null;
};

type HomepageSettingsRow = {
  id: string;
  header_logo_url: string | null;
  header_site_name: string | null;
  header_tagline: string | null;
  header_logo_height: number | null;
  header_site_name_font_size: number | null;
  header_tagline_font_size: number | null;
  header_menu_font_size: number | null;
  header_menu_gap: number | null;

  hero_content_mode: string | null;
  hero_custom_badge: string | null;
  hero_custom_title: string | null;
  hero_custom_subtitle: string | null;
  hero_custom_image_url: string | null;
  hero_custom_cta_text: string | null;
  hero_custom_cta_link: string | null;
  hero_custom_meta_1_label: string | null;
  hero_custom_meta_1_value: string | null;
  hero_custom_meta_2_label: string | null;
  hero_custom_meta_2_value: string | null;
  hero_custom_meta_3_label: string | null;
  hero_custom_meta_3_value: string | null;

  hero_badge: string | null;
  hero_launch_note_title: string | null;
  hero_launch_note_text: string | null;

  featured_section_eyebrow: string | null;
  featured_section_title: string | null;
  featured_section_subtitle: string | null;

  rankings_teams_title: string | null;
  rankings_players_title: string | null;

  players_watch_eyebrow: string | null;
  players_watch_title: string | null;

  quick_links_eyebrow: string | null;
  quick_links_title: string | null;

  show_hero: boolean | null;
  show_featured_section: boolean | null;
  show_rankings: boolean | null;
  show_players_watch: boolean | null;
  show_quick_links: boolean | null;

  hero_order: number | null;
  featured_section_order: number | null;
  rankings_order: number | null;
  players_watch_order: number | null;
  quick_links_order: number | null;
};

type HomepagePlayerWatch = {
  id: string;
  sort_order: number;
  player_name: string;
  team_name: string;
  tag: string;
  note: string;
  is_active: boolean;
};

type HomepageQuickLink = {
  id: string;
  sort_order: number;
  title: string;
  subtitle: string;
  href: string;
  is_active: boolean;
};

type HomepageCommunityCard = {
  id: string;
  sort_order: number;
  section_type: "leadership" | "advisory" | "member";
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  is_active: boolean;
};

const defaultHomepageForm = {
  header_logo_url: "",
  header_site_name: "Cricket Community Egypt",
  header_tagline: "Uniting Cricket Enthusiasts",
  header_logo_height: 40,
  header_site_name_font_size: 11,
  header_tagline_font_size: 16,
  header_menu_font_size: 14,
  header_menu_gap: 24,

  hero_content_mode: "featured_tournament",
  hero_custom_badge: "Main Highlight",
  hero_custom_title: "",
  hero_custom_subtitle: "",
  hero_custom_image_url: "",
  hero_custom_cta_text: "Explore Now",
  hero_custom_cta_link: "/news",
  hero_custom_meta_1_label: "Highlight",
  hero_custom_meta_1_value: "",
  hero_custom_meta_2_label: "Date",
  hero_custom_meta_2_value: "",
  hero_custom_meta_3_label: "Venue",
  hero_custom_meta_3_value: "",

  hero_badge: "Main Highlight",
  hero_launch_note_title: "Official Launch Note",
  hero_launch_note_text:
    "Homepage hero is now dynamic. Admin can switch the featured tournament directly from the dashboard without changing code.",

  featured_section_eyebrow: "Featured Tournament",
  featured_section_title: "Featured Tournament",
  featured_section_subtitle: "Tournament overview section",

  rankings_teams_title: "Top Teams",
  rankings_players_title: "Top Players",

  players_watch_eyebrow: "Tournament Watchlist",
  players_watch_title: "Players to Watch",

  quick_links_eyebrow: "Quick Navigation",
  quick_links_title: "Explore the Platform",

  show_hero: true,
  show_featured_section: true,
  show_rankings: true,
  show_players_watch: true,
  show_quick_links: true,

  hero_order: 1,
  featured_section_order: 2,
  rankings_order: 3,
  players_watch_order: 4,
  quick_links_order: 6,
};

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

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "png";
}

function newPlayerWatch(): HomepagePlayerWatch {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    sort_order: 0,
    player_name: "",
    team_name: "",
    tag: "",
    note: "",
    is_active: true,
  };
}

function newQuickLink(): HomepageQuickLink {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    sort_order: 0,
    title: "",
    subtitle: "",
    href: "",
    is_active: true,
  };
}

function newCommunityCard(
  sectionType: "leadership" | "advisory" | "member"
): HomepageCommunityCard {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    sort_order: 0,
    section_type: sectionType,
    badge:
      sectionType === "leadership"
        ? "CCE Leadership"
        : sectionType === "advisory"
        ? "Advisory Body"
        : "CCE Members",
    title: "",
    subtitle: "",
    description: "",
    href: "/community",
    is_active: true,
  };
}

async function replaceTable<T extends { id: string }>(
  table: string,
  rows: T[],
  mapper: (row: T) => Record<string, any>
) {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .neq("id", "");

  if (deleteError) throw deleteError;

  if (rows.length === 0) return;

  const payload = rows.map(mapper);
  const { error: insertError } = await supabase.from(table).insert(payload);

  if (insertError) throw insertError;
}

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [homepageSettingsId, setHomepageSettingsId] = useState("");
  const [homepageForm, setHomepageForm] = useState(defaultHomepageForm);

  const [playersWatch, setPlayersWatch] = useState<HomepagePlayerWatch[]>([]);
  const [quickLinks, setQuickLinks] = useState<HomepageQuickLink[]>([]);
  const [communityCards, setCommunityCards] = useState<HomepageCommunityCard[]>([]);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [savingHomepage, setSavingHomepage] = useState(false);
  const [savingPlayersWatch, setSavingPlayersWatch] = useState(false);
  const [savingQuickLinks, setSavingQuickLinks] = useState(false);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [uploadingHeaderLogo, setUploadingHeaderLogo] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);

  const [featuredMessage, setFeaturedMessage] = useState("");
  const [homepageMessage, setHomepageMessage] = useState("");
  const [playersWatchMessage, setPlayersWatchMessage] = useState("");
  const [quickLinksMessage, setQuickLinksMessage] = useState("");
  const [communityMessage, setCommunityMessage] = useState("");

  const [featuredMessageType, setFeaturedMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [homepageMessageType, setHomepageMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [playersWatchMessageType, setPlayersWatchMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [quickLinksMessageType, setQuickLinksMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [communityMessageType, setCommunityMessageType] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoadingSetup(true);
    await Promise.all([
      loadTournamentOptions(),
      loadHomepageSettings(),
      loadPlayersWatch(),
      loadQuickLinks(),
      loadCommunityCards(),
    ]);
    setLoadingSetup(false);
  }

  async function loadTournamentOptions() {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, slug, status, is_featured_home")
      .order("created_at", { ascending: false });

    if (error) {
      setFeaturedMessage(`Failed to load tournaments. ${formatError(error)}`);
      setFeaturedMessageType("error");
      setTournaments([]);
      return;
    }

    const rows = (data || []) as TournamentOption[];
    setTournaments(rows);

    const currentFeatured = rows.find((item) => item.is_featured_home);
    if (currentFeatured) {
      setSelectedTournamentId(currentFeatured.id);
    } else if (rows.length > 0) {
      setSelectedTournamentId(rows[0].id);
    }
  }

  async function loadHomepageSettings() {
    const { data, error } = await supabase
      .from("homepage_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      setHomepageMessage(
        `Failed to load homepage settings. ${formatError(error)}`
      );
      setHomepageMessageType("error");
      return;
    }

    const row = data as HomepageSettingsRow | null;
    if (!row) return;

    setHomepageSettingsId(row.id);
    setHomepageForm({
      header_logo_url: row.header_logo_url || defaultHomepageForm.header_logo_url,
      header_site_name:
        row.header_site_name || defaultHomepageForm.header_site_name,
      header_tagline: row.header_tagline || defaultHomepageForm.header_tagline,
      header_logo_height:
        row.header_logo_height ?? defaultHomepageForm.header_logo_height,
      header_site_name_font_size:
        row.header_site_name_font_size ??
        defaultHomepageForm.header_site_name_font_size,
      header_tagline_font_size:
        row.header_tagline_font_size ??
        defaultHomepageForm.header_tagline_font_size,
      header_menu_font_size:
        row.header_menu_font_size ?? defaultHomepageForm.header_menu_font_size,
      header_menu_gap: row.header_menu_gap ?? defaultHomepageForm.header_menu_gap,

      hero_content_mode:
        row.hero_content_mode || defaultHomepageForm.hero_content_mode,
      hero_custom_badge:
        row.hero_custom_badge || defaultHomepageForm.hero_custom_badge,
      hero_custom_title:
        row.hero_custom_title || defaultHomepageForm.hero_custom_title,
      hero_custom_subtitle:
        row.hero_custom_subtitle || defaultHomepageForm.hero_custom_subtitle,
      hero_custom_image_url:
        row.hero_custom_image_url || defaultHomepageForm.hero_custom_image_url,
      hero_custom_cta_text:
        row.hero_custom_cta_text || defaultHomepageForm.hero_custom_cta_text,
      hero_custom_cta_link:
        row.hero_custom_cta_link || defaultHomepageForm.hero_custom_cta_link,
      hero_custom_meta_1_label:
        row.hero_custom_meta_1_label ||
        defaultHomepageForm.hero_custom_meta_1_label,
      hero_custom_meta_1_value:
        row.hero_custom_meta_1_value ||
        defaultHomepageForm.hero_custom_meta_1_value,
      hero_custom_meta_2_label:
        row.hero_custom_meta_2_label ||
        defaultHomepageForm.hero_custom_meta_2_label,
      hero_custom_meta_2_value:
        row.hero_custom_meta_2_value ||
        defaultHomepageForm.hero_custom_meta_2_value,
      hero_custom_meta_3_label:
        row.hero_custom_meta_3_label ||
        defaultHomepageForm.hero_custom_meta_3_label,
      hero_custom_meta_3_value:
        row.hero_custom_meta_3_value ||
        defaultHomepageForm.hero_custom_meta_3_value,

      hero_badge: row.hero_badge || defaultHomepageForm.hero_badge,
      hero_launch_note_title:
        row.hero_launch_note_title ||
        defaultHomepageForm.hero_launch_note_title,
      hero_launch_note_text:
        row.hero_launch_note_text || defaultHomepageForm.hero_launch_note_text,

      featured_section_eyebrow:
        row.featured_section_eyebrow ||
        defaultHomepageForm.featured_section_eyebrow,
      featured_section_title:
        row.featured_section_title || defaultHomepageForm.featured_section_title,
      featured_section_subtitle:
        row.featured_section_subtitle ||
        defaultHomepageForm.featured_section_subtitle,

      rankings_teams_title:
        row.rankings_teams_title || defaultHomepageForm.rankings_teams_title,
      rankings_players_title:
        row.rankings_players_title ||
        defaultHomepageForm.rankings_players_title,

      players_watch_eyebrow:
        row.players_watch_eyebrow ||
        defaultHomepageForm.players_watch_eyebrow,
      players_watch_title:
        row.players_watch_title || defaultHomepageForm.players_watch_title,

      quick_links_eyebrow:
        row.quick_links_eyebrow || defaultHomepageForm.quick_links_eyebrow,
      quick_links_title:
        row.quick_links_title || defaultHomepageForm.quick_links_title,

      show_hero: row.show_hero ?? defaultHomepageForm.show_hero,
      show_featured_section:
        row.show_featured_section ?? defaultHomepageForm.show_featured_section,
      show_rankings: row.show_rankings ?? defaultHomepageForm.show_rankings,
      show_players_watch:
        row.show_players_watch ?? defaultHomepageForm.show_players_watch,
      show_quick_links:
        row.show_quick_links ?? defaultHomepageForm.show_quick_links,

      hero_order: row.hero_order ?? defaultHomepageForm.hero_order,
      featured_section_order:
        row.featured_section_order ?? defaultHomepageForm.featured_section_order,
      rankings_order: row.rankings_order ?? defaultHomepageForm.rankings_order,
      players_watch_order:
        row.players_watch_order ?? defaultHomepageForm.players_watch_order,
      quick_links_order:
        row.quick_links_order ?? defaultHomepageForm.quick_links_order,
    });
  }

  async function loadPlayersWatch() {
    const { data, error } = await supabase
      .from("homepage_players_watch")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setPlayersWatchMessage(
        `Failed to load Players to Watch. ${formatError(error)}`
      );
      setPlayersWatchMessageType("error");
      return;
    }

    setPlayersWatch((data || []) as HomepagePlayerWatch[]);
  }

  async function loadQuickLinks() {
    const { data, error } = await supabase
      .from("homepage_quick_links")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setQuickLinksMessage(`Failed to load Quick Links. ${formatError(error)}`);
      setQuickLinksMessageType("error");
      return;
    }

    setQuickLinks((data || []) as HomepageQuickLink[]);
  }

  async function loadCommunityCards() {
    const { data, error } = await supabase
      .from("homepage_community_cards")
      .select("*")
      .order("section_type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      setCommunityMessage(
        `Failed to load Community Structure cards. ${formatError(error)}`
      );
      setCommunityMessageType("error");
      return;
    }

    setCommunityCards((data || []) as HomepageCommunityCard[]);
  }

  async function handleSaveHomepageFeaturedTournament() {
    if (!selectedTournamentId) {
      setFeaturedMessage("Please select a tournament first.");
      setFeaturedMessageType("error");
      return;
    }

    setSavingFeatured(true);
    setFeaturedMessage("");
    setFeaturedMessageType("");

    try {
      const currentFeatured = tournaments.find((item) => item.is_featured_home);

      if (currentFeatured && currentFeatured.id !== selectedTournamentId) {
        const { error: unsetError } = await supabase
          .from("tournaments")
          .update({ is_featured_home: false })
          .eq("id", currentFeatured.id);

        if (unsetError) throw unsetError;
      }

      const { error: setError } = await supabase
        .from("tournaments")
        .update({ is_featured_home: true })
        .eq("id", selectedTournamentId);

      if (setError) throw setError;

      setFeaturedMessage("Homepage featured tournament updated successfully.");
      setFeaturedMessageType("success");
      await loadTournamentOptions();
    } catch (error) {
      setFeaturedMessage(
        `Failed to save featured tournament. ${formatError(error)}`
      );
      setFeaturedMessageType("error");
    } finally {
      setSavingFeatured(false);
    }
  }

  async function handleHeaderLogoUpload(file: File) {
    try {
      setUploadingHeaderLogo(true);
      const fileExt = getFileExtension(file.name);
      const fileName = `homepage-header-${Date.now()}.${fileExt}`;
      const filePath = `homepage/header/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
      setHomepageForm((prev) => ({ ...prev, header_logo_url: data.publicUrl }));
      setHomepageMessage("Header logo uploaded successfully.");
      setHomepageMessageType("success");
    } catch (error) {
      setHomepageMessage(
        `Failed to upload header logo. ${formatError(error)}`
      );
      setHomepageMessageType("error");
    } finally {
      setUploadingHeaderLogo(false);
    }
  }

  async function handleHeroCustomImageUpload(file: File) {
    try {
      setUploadingHeroImage(true);
      const fileExt = getFileExtension(file.name);
      const fileName = `hero-custom-${Date.now()}.${fileExt}`;
      const filePath = `homepage/hero/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
      setHomepageForm((prev) => ({
        ...prev,
        hero_custom_image_url: data.publicUrl,
      }));
      setHomepageMessage("Hero custom image uploaded successfully.");
      setHomepageMessageType("success");
    } catch (error) {
      setHomepageMessage(
        `Failed to upload hero custom image. ${formatError(error)}`
      );
      setHomepageMessageType("error");
    } finally {
      setUploadingHeroImage(false);
    }
  }

  async function handleSaveHomepageSettings() {
    setSavingHomepage(true);
    setHomepageMessage("");
    setHomepageMessageType("");

    try {
      const payload = {
        ...homepageForm,
        updated_at: new Date().toISOString(),
      };

      if (homepageSettingsId) {
        const { error } = await supabase
          .from("homepage_settings")
          .update(payload)
          .eq("id", homepageSettingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("homepage_settings")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        if (data?.id) setHomepageSettingsId(data.id);
      }

      setHomepageMessage("Homepage settings updated successfully.");
      setHomepageMessageType("success");
      await loadHomepageSettings();
    } catch (error) {
      setHomepageMessage(
        `Failed to save homepage settings. ${formatError(error)}`
      );
      setHomepageMessageType("error");
    } finally {
      setSavingHomepage(false);
    }
  }

  async function handleSavePlayersWatch() {
    setSavingPlayersWatch(true);
    setPlayersWatchMessage("");
    setPlayersWatchMessageType("");

    try {
      await replaceTable("homepage_players_watch", playersWatch, (row) => ({
        sort_order: Number(row.sort_order) || 0,
        player_name: row.player_name || "",
        team_name: row.team_name || "",
        tag: row.tag || "",
        note: row.note || "",
        is_active: !!row.is_active,
        updated_at: new Date().toISOString(),
      }));

      setPlayersWatchMessage("Players to Watch updated successfully.");
      setPlayersWatchMessageType("success");
      await loadPlayersWatch();
    } catch (error) {
      setPlayersWatchMessage(
        `Failed to save Players to Watch. ${formatError(error)}`
      );
      setPlayersWatchMessageType("error");
    } finally {
      setSavingPlayersWatch(false);
    }
  }

  async function handleSaveQuickLinks() {
    setSavingQuickLinks(true);
    setQuickLinksMessage("");
    setQuickLinksMessageType("");

    try {
      await replaceTable("homepage_quick_links", quickLinks, (row) => ({
        sort_order: Number(row.sort_order) || 0,
        title: row.title || "",
        subtitle: row.subtitle || "",
        href: row.href || "",
        is_active: !!row.is_active,
        updated_at: new Date().toISOString(),
      }));

      setQuickLinksMessage("Quick Links updated successfully.");
      setQuickLinksMessageType("success");
      await loadQuickLinks();
    } catch (error) {
      setQuickLinksMessage(
        `Failed to save Quick Links. ${formatError(error)}`
      );
      setQuickLinksMessageType("error");
    } finally {
      setSavingQuickLinks(false);
    }
  }

  async function handleSaveCommunityCards() {
    setSavingCommunity(true);
    setCommunityMessage("");
    setCommunityMessageType("");

    try {
      await replaceTable("homepage_community_cards", communityCards, (row) => ({
        sort_order: Number(row.sort_order) || 0,
        section_type: row.section_type,
        badge: row.badge || "",
        title: row.title || "",
        subtitle: row.subtitle || "",
        description: row.description || "",
        href: row.href || "",
        is_active: !!row.is_active,
        updated_at: new Date().toISOString(),
      }));

      setCommunityMessage("Community Structure updated successfully.");
      setCommunityMessageType("success");
      await loadCommunityCards();
    } catch (error) {
      setCommunityMessage(
        `Failed to save Community Structure. ${formatError(error)}`
      );
      setCommunityMessageType("error");
    } finally {
      setSavingCommunity(false);
    }
  }

  const selectedTournament = useMemo(() => {
    return tournaments.find((item) => item.id === selectedTournamentId) || null;
  }, [selectedTournamentId, tournaments]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Homepage Control Center
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Public homepage control aligned section by section.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Control the same sections you see on the public homepage, with direct
            links to the deeper admin routes where needed.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Header & Hero
          </p>
          <h2 className="mt-2 text-2xl font-bold">Site identity and hero control</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CmsInput
              label="Site Name"
              value={homepageForm.header_site_name}
              onChange={(value) =>
                setHomepageForm((prev) => ({ ...prev, header_site_name: value }))
              }
            />

            <CmsInput
              label="Tagline"
              value={homepageForm.header_tagline}
              onChange={(value) =>
                setHomepageForm((prev) => ({ ...prev, header_tagline: value }))
              }
            />

            <CmsNumberInput
              label="Logo Height (px)"
              value={homepageForm.header_logo_height}
              onChange={(value) =>
                setHomepageForm((prev) => ({ ...prev, header_logo_height: value }))
              }
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Header Logo Upload
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleHeaderLogoUpload(file);
                }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
              />
              <p className="mt-2 text-xs text-slate-500">
                {uploadingHeaderLogo ? "Uploading..." : "Upload header logo"}
              </p>
            </div>

            <CmsNumberInput
              label="Site Name Font Size (px)"
              value={homepageForm.header_site_name_font_size}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  header_site_name_font_size: value,
                }))
              }
            />

            <CmsNumberInput
              label="Tagline Font Size (px)"
              value={homepageForm.header_tagline_font_size}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  header_tagline_font_size: value,
                }))
              }
            />

            <CmsNumberInput
              label="Menu Font Size (px)"
              value={homepageForm.header_menu_font_size}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  header_menu_font_size: value,
                }))
              }
            />

            <CmsNumberInput
              label="Menu Gap (px)"
              value={homepageForm.header_menu_gap}
              onChange={(value) =>
                setHomepageForm((prev) => ({ ...prev, header_menu_gap: value }))
              }
            />
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 p-4">
            <h3 className="text-lg font-bold text-slate-900">Hero Mode</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Hero Content Mode
                </label>
                <select
                  value={homepageForm.hero_content_mode}
                  onChange={(e) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_content_mode: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none"
                >
                  <option value="featured_tournament">Featured Tournament</option>
                  <option value="custom_highlight">Custom Highlight</option>
                  <option value="news_highlight">News Highlight</option>
                </select>
              </div>

              <CmsInput
                label="Hero Badge"
                value={homepageForm.hero_badge}
                onChange={(value) =>
                  setHomepageForm((prev) => ({ ...prev, hero_badge: value }))
                }
              />

              <CmsInput
                label="Launch Note Title"
                value={homepageForm.hero_launch_note_title}
                onChange={(value) =>
                  setHomepageForm((prev) => ({
                    ...prev,
                    hero_launch_note_title: value,
                  }))
                }
              />

              <div className="md:col-span-2">
                <CmsTextarea
                  label="Launch Note Text"
                  value={homepageForm.hero_launch_note_text}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_launch_note_text: value,
                    }))
                  }
                />
              </div>
            </div>

            {homepageForm.hero_content_mode === "custom_highlight" ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <CmsInput
                  label="Custom Badge"
                  value={homepageForm.hero_custom_badge}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_badge: value,
                    }))
                  }
                />
                <CmsInput
                  label="Custom Title"
                  value={homepageForm.hero_custom_title}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_title: value,
                    }))
                  }
                />
                <div className="md:col-span-2">
                  <CmsTextarea
                    label="Custom Subtitle"
                    value={homepageForm.hero_custom_subtitle}
                    onChange={(value) =>
                      setHomepageForm((prev) => ({
                        ...prev,
                        hero_custom_subtitle: value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Hero Image Upload
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleHeroCustomImageUpload(file);
                    }}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {uploadingHeroImage ? "Uploading..." : "Upload hero image"}
                  </p>
                </div>

                <CmsInput
                  label="Custom CTA Text"
                  value={homepageForm.hero_custom_cta_text}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_cta_text: value,
                    }))
                  }
                />
                <CmsInput
                  label="Custom CTA Link"
                  value={homepageForm.hero_custom_cta_link}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_cta_link: value,
                    }))
                  }
                />
                <CmsInput
                  label="Meta 1 Label"
                  value={homepageForm.hero_custom_meta_1_label}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_meta_1_label: value,
                    }))
                  }
                />
                <CmsInput
                  label="Meta 1 Value"
                  value={homepageForm.hero_custom_meta_1_value}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_meta_1_value: value,
                    }))
                  }
                />
                <CmsInput
                  label="Meta 2 Label"
                  value={homepageForm.hero_custom_meta_2_label}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_meta_2_label: value,
                    }))
                  }
                />
                <CmsInput
                  label="Meta 2 Value"
                  value={homepageForm.hero_custom_meta_2_value}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_meta_2_value: value,
                    }))
                  }
                />
                <CmsInput
                  label="Meta 3 Label"
                  value={homepageForm.hero_custom_meta_3_label}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_meta_3_label: value,
                    }))
                  }
                />
                <CmsInput
                  label="Meta 3 Value"
                  value={homepageForm.hero_custom_meta_3_value}
                  onChange={(value) =>
                    setHomepageForm((prev) => ({
                      ...prev,
                      hero_custom_meta_3_value: value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveHomepageSettings}
              disabled={savingHomepage || uploadingHeaderLogo || uploadingHeroImage}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingHomepage ? "Saving..." : "Save Header & Hero"}
            </button>
            {homepageMessage ? (
              <MessageBox type={homepageMessageType}>{homepageMessage}</MessageBox>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Featured Tournament
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Featured tournament and homepage block labels
          </h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Featured Tournament
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                disabled={loadingSetup || savingFeatured}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">Select tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title || "Untitled Tournament"}
                  </option>
                ))}
              </select>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleSaveHomepageFeaturedTournament}
                  disabled={savingFeatured || !selectedTournamentId}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingFeatured ? "Saving..." : "Save Featured Tournament"}
                </button>

                <a
                  href="/admin/tournaments"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open Tournaments
                </a>
                <a
                  href="/admin/matches"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open Match Center
                </a>
                <a
                  href="/admin/tournament-teams"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open Tournament Teams
                </a>
              </div>

              {featuredMessage ? (
                <MessageBox type={featuredMessageType}>{featuredMessage}</MessageBox>
              ) : null}
            </div>

            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Current Selection
              </p>
              {selectedTournament ? (
                <>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    {selectedTournament.title || "Untitled Tournament"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Slug: {selectedTournament.slug || "Not available"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Status: {selectedTournament.status || "Not set"}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Select a tournament to preview the homepage selection.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <CmsInput
              label="Section Eyebrow"
              value={homepageForm.featured_section_eyebrow}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  featured_section_eyebrow: value,
                }))
              }
            />
            <CmsInput
              label="Section Title"
              value={homepageForm.featured_section_title}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  featured_section_title: value,
                }))
              }
            />
            <div className="md:col-span-2">
              <CmsTextarea
                label="Section Subtitle"
                value={homepageForm.featured_section_subtitle}
                onChange={(value) =>
                  setHomepageForm((prev) => ({
                    ...prev,
                    featured_section_subtitle: value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Rankings
          </p>
          <h2 className="mt-2 text-2xl font-bold">Ranking section headings and routes</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CmsInput
              label="Top Teams Title"
              value={homepageForm.rankings_teams_title}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  rankings_teams_title: value,
                }))
              }
            />
            <CmsInput
              label="Top Players Title"
              value={homepageForm.rankings_players_title}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  rankings_players_title: value,
                }))
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/admin/team-rankings"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Team Rankings
            </a>
            <a
              href="/admin/player-rankings"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Player Rankings
            </a>
            <a
              href="/admin/rankings-ids"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Rankings ID Helper
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Players to Watch
          </p>
          <h2 className="mt-2 text-2xl font-bold">Homepage player watch cards</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CmsInput
              label="Section Eyebrow"
              value={homepageForm.players_watch_eyebrow}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  players_watch_eyebrow: value,
                }))
              }
            />
            <CmsInput
              label="Section Title"
              value={homepageForm.players_watch_title}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  players_watch_title: value,
                }))
              }
            />
          </div>

          <SectionEditor
            title="Players To Watch Cards"
            onAdd={() => setPlayersWatch((prev) => [...prev, newPlayerWatch()])}
          >
            {playersWatch.map((item, index) => (
              <EditorCard
                key={item.id}
                title={`Player Card ${index + 1}`}
                onDelete={() =>
                  setPlayersWatch((prev) => prev.filter((x) => x.id !== item.id))
                }
              >
                <CmsNumberInput
                  label="Sort Order"
                  value={item.sort_order}
                  onChange={(value) =>
                    setPlayersWatch((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, sort_order: value } : x
                      )
                    )
                  }
                />
                <CmsInput
                  label="Player Name"
                  value={item.player_name}
                  onChange={(value) =>
                    setPlayersWatch((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, player_name: value } : x
                      )
                    )
                  }
                />
                <CmsInput
                  label="Team Name"
                  value={item.team_name}
                  onChange={(value) =>
                    setPlayersWatch((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, team_name: value } : x
                      )
                    )
                  }
                />
                <CmsInput
                  label="Tag"
                  value={item.tag}
                  onChange={(value) =>
                    setPlayersWatch((prev) =>
                      prev.map((x) => (x.id === item.id ? { ...x, tag: value } : x))
                    )
                  }
                />
                <CmsTextarea
                  label="Note"
                  value={item.note}
                  onChange={(value) =>
                    setPlayersWatch((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, note: value } : x
                      )
                    )
                  }
                />
                <CmsCheckbox
                  label="Active"
                  checked={item.is_active}
                  onChange={(checked) =>
                    setPlayersWatch((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, is_active: checked } : x
                      )
                    )
                  }
                />
              </EditorCard>
            ))}
          </SectionEditor>

          <div className="mt-6">
            <button
              onClick={handleSavePlayersWatch}
              disabled={savingPlayersWatch}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPlayersWatch ? "Saving..." : "Save Players to Watch"}
            </button>
            {playersWatchMessage ? (
              <MessageBox type={playersWatchMessageType}>
                {playersWatchMessage}
              </MessageBox>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Community Structure
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Leadership, advisory, and member homepage cards
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            This controls the homepage community section.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setCommunityCards((prev) => [
                  ...prev,
                  newCommunityCard("leadership"),
                ])
              }
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Add Leadership Card
            </button>
            <button
              type="button"
              onClick={() =>
                setCommunityCards((prev) => [...prev, newCommunityCard("advisory")])
              }
              className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Add Advisory Card
            </button>
            <button
              type="button"
              onClick={() =>
                setCommunityCards((prev) => [...prev, newCommunityCard("member")])
              }
              className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Add Member Card
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {communityCards.map((item, index) => (
              <EditorCard
                key={item.id}
                title={`Community Card ${index + 1}`}
                onDelete={() =>
                  setCommunityCards((prev) => prev.filter((x) => x.id !== item.id))
                }
              >
                <FieldSelectLocal
                  label="Section Type"
                  value={item.section_type}
                  onChange={(value) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id
                          ? {
                              ...x,
                              section_type: value as
                                | "leadership"
                                | "advisory"
                                | "member",
                            }
                          : x
                      )
                    )
                  }
                  options={[
                    { value: "leadership", label: "Leadership" },
                    { value: "advisory", label: "Advisory Body" },
                    { value: "member", label: "Members" },
                  ]}
                />

                <CmsNumberInput
                  label="Sort Order"
                  value={item.sort_order}
                  onChange={(value) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, sort_order: value } : x
                      )
                    )
                  }
                />

                <CmsInput
                  label="Badge"
                  value={item.badge}
                  onChange={(value) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, badge: value } : x
                      )
                    )
                  }
                />

                <CmsInput
                  label="Title"
                  value={item.title}
                  onChange={(value) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, title: value } : x
                      )
                    )
                  }
                />

                <CmsInput
                  label="Subtitle"
                  value={item.subtitle}
                  onChange={(value) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, subtitle: value } : x
                      )
                    )
                  }
                />

                <CmsInput
                  label="Href"
                  value={item.href}
                  onChange={(value) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, href: value } : x
                      )
                    )
                  }
                />

                <div className="md:col-span-2">
                  <CmsTextarea
                    label="Description"
                    value={item.description}
                    onChange={(value) =>
                      setCommunityCards((prev) =>
                        prev.map((x) =>
                          x.id === item.id ? { ...x, description: value } : x
                        )
                      )
                    }
                  />
                </div>

                <CmsCheckbox
                  label="Active"
                  checked={item.is_active}
                  onChange={(checked) =>
                    setCommunityCards((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, is_active: checked } : x
                      )
                    )
                  }
                />
              </EditorCard>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveCommunityCards}
              disabled={savingCommunity}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingCommunity ? "Saving..." : "Save Community Structure"}
            </button>
            {communityMessage ? (
              <MessageBox type={communityMessageType}>{communityMessage}</MessageBox>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Quick Links
          </p>
          <h2 className="mt-2 text-2xl font-bold">Homepage quick navigation links</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CmsInput
              label="Section Eyebrow"
              value={homepageForm.quick_links_eyebrow}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  quick_links_eyebrow: value,
                }))
              }
            />
            <CmsInput
              label="Section Title"
              value={homepageForm.quick_links_title}
              onChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  quick_links_title: value,
                }))
              }
            />
          </div>

          <SectionEditor
            title="Quick Link Cards"
            onAdd={() => setQuickLinks((prev) => [...prev, newQuickLink()])}
          >
            {quickLinks.map((item, index) => (
              <EditorCard
                key={item.id}
                title={`Quick Link ${index + 1}`}
                onDelete={() =>
                  setQuickLinks((prev) => prev.filter((x) => x.id !== item.id))
                }
              >
                <CmsNumberInput
                  label="Sort Order"
                  value={item.sort_order}
                  onChange={(value) =>
                    setQuickLinks((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, sort_order: value } : x
                      )
                    )
                  }
                />
                <CmsInput
                  label="Title"
                  value={item.title}
                  onChange={(value) =>
                    setQuickLinks((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, title: value } : x
                      )
                    )
                  }
                />
                <CmsInput
                  label="Subtitle"
                  value={item.subtitle}
                  onChange={(value) =>
                    setQuickLinks((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, subtitle: value } : x
                      )
                    )
                  }
                />
                <CmsInput
                  label="Href"
                  value={item.href}
                  onChange={(value) =>
                    setQuickLinks((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, href: value } : x
                      )
                    )
                  }
                />
                <CmsCheckbox
                  label="Active"
                  checked={item.is_active}
                  onChange={(checked) =>
                    setQuickLinks((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, is_active: checked } : x
                      )
                    )
                  }
                />
              </EditorCard>
            ))}
          </SectionEditor>

          <div className="mt-6">
            <button
              onClick={handleSaveQuickLinks}
              disabled={savingQuickLinks}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingQuickLinks ? "Saving..." : "Save Quick Links"}
            </button>
            {quickLinksMessage ? (
              <MessageBox type={quickLinksMessageType}>{quickLinksMessage}</MessageBox>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Homepage Section Visibility
          </p>
          <h2 className="mt-2 text-2xl font-bold">Show, hide, and order sections</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <VisibilityCard
              title="Hero"
              checked={homepageForm.show_hero}
              order={homepageForm.hero_order}
              onCheckedChange={(checked) =>
                setHomepageForm((prev) => ({ ...prev, show_hero: checked }))
              }
              onOrderChange={(value) =>
                setHomepageForm((prev) => ({ ...prev, hero_order: value }))
              }
            />
            <VisibilityCard
              title="Featured Tournament"
              checked={homepageForm.show_featured_section}
              order={homepageForm.featured_section_order}
              onCheckedChange={(checked) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  show_featured_section: checked,
                }))
              }
              onOrderChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  featured_section_order: value,
                }))
              }
            />
            <VisibilityCard
              title="Rankings"
              checked={homepageForm.show_rankings}
              order={homepageForm.rankings_order}
              onCheckedChange={(checked) =>
                setHomepageForm((prev) => ({ ...prev, show_rankings: checked }))
              }
              onOrderChange={(value) =>
                setHomepageForm((prev) => ({ ...prev, rankings_order: value }))
              }
            />
            <VisibilityCard
              title="Players to Watch"
              checked={homepageForm.show_players_watch}
              order={homepageForm.players_watch_order}
              onCheckedChange={(checked) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  show_players_watch: checked,
                }))
              }
              onOrderChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  players_watch_order: value,
                }))
              }
            />
            <VisibilityCard
              title="Quick Links"
              checked={homepageForm.show_quick_links}
              order={homepageForm.quick_links_order}
              onCheckedChange={(checked) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  show_quick_links: checked,
                }))
              }
              onOrderChange={(value) =>
                setHomepageForm((prev) => ({
                  ...prev,
                  quick_links_order: value,
                }))
              }
            />
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveHomepageSettings}
              disabled={savingHomepage}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingHomepage ? "Saving..." : "Save Section Visibility"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Other Admin Modules
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            Platform control panels
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              title: "Homepage Visual",
              description: "Manage the right panel featured visual block.",
              href: "/admin/homepage-visual",
              tag: "Homepage Media",
            },
            {
              title: "Homepage Live Updates",
              description: "Manage rotating homepage update cards.",
              href: "/admin/homepage-live-updates",
              tag: "Homepage Media",
            },
            {
              title: "Match Center",
              description: "Control next match and latest result data.",
              href: "/admin/matches",
              tag: "Live Control",
            },
            {
              title: "Tournament Teams",
              description: "Control participating teams for homepage and tournament view.",
              href: "/admin/tournament-teams",
              tag: "Tournament Setup",
            },
            {
              title: "Team Rankings",
              description: "Manage homepage and rankings page team tables.",
              href: "/admin/team-rankings",
              tag: "Rankings",
            },
            {
              title: "Player Rankings",
              description: "Manage homepage and rankings page player tables.",
              href: "/admin/player-rankings",
              tag: "Rankings",
            },
          ].map((module) => (
            <article
              key={module.href}
              className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {module.tag}
              </span>
              <h3 className="mt-4 text-xl font-bold">{module.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {module.description}
              </p>
              <a
                href={module.href}
                className="mt-5 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open Module
              </a>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function MessageBox({
  type,
  children,
}: {
  type: "success" | "error" | "";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
        type === "error"
          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      }`}
    >
      {children}
    </div>
  );
}

function CmsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function CmsTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function CmsNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}

function CmsCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-1 flex items-center gap-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function SectionEditor({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add New
        </button>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function EditorCard({
  title,
  onDelete,
  children,
}: {
  title: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-base font-bold text-slate-900">{title}</h4>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          Delete
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function FieldSelectLocal({
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
          <option key={`${label}-${item.value}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function VisibilityCard({
  title,
  checked,
  order,
  onCheckedChange,
  onOrderChange,
}: {
  title: string;
  checked: boolean;
  order: number | null;
  onCheckedChange: (checked: boolean) => void;
  onOrderChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <div className="mt-4">
        <CmsCheckbox
          label={`Show ${title}`}
          checked={checked}
          onChange={onCheckedChange}
        />
      </div>
      <div className="mt-4">
        <CmsNumberInput
          label={`${title} Order`}
          value={order}
          onChange={onOrderChange}
        />
      </div>
    </div>
  );
}