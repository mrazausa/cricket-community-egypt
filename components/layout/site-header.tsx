"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type HeaderSettings = {
  header_logo_url?: string | null;
  header_site_name?: string | null;
  header_tagline?: string | null;
  header_logo_height?: number | null;
  header_site_name_font_size?: number | null;
  header_tagline_font_size?: number | null;
  header_menu_font_size?: number | null;
  header_menu_gap?: number | null;
};

type SitePageSetting = {
  page_key: string;
  title: string | null;
  is_visible: boolean;
  show_in_menu: boolean;
};

const fallbackHeader: Required<HeaderSettings> = {
  header_logo_url: "",
  header_site_name: "Cricket Community Egypt",
  header_tagline: "Uniting Cricket Enthusiasts",
  header_logo_height: 46,
  header_site_name_font_size: 11,
  header_tagline_font_size: 16,
  header_menu_font_size: 14,
  header_menu_gap: 18,
};

const fallbackPublicNav = [
  { name: "Home", href: "/" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Rankings", href: "/rankings" },
  { name: "Teams", href: "/teams" },
  { name: "Players", href: "/players" },
  { name: "Media", href: "/media" },
  { name: "History", href: "/history" },
];

function mapPageKeyToHref(pageKey: string) {
  if (pageKey === "home") return "/";
  if (pageKey === "tournaments") return "/tournaments";
  if (pageKey === "teams") return "/teams";
  if (pageKey === "players") return "/players";
  if (pageKey === "media") return "/media";
  if (pageKey === "history") return "/history";
  if (pageKey === "register_team") return "/register/team";
  if (pageKey === "register_player") return "/register/player";
  return "/";
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [headerSettings, setHeaderSettings] =
    useState<HeaderSettings>(fallbackHeader);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [publicNavItems, setPublicNavItems] = useState(fallbackPublicNav);

  const registerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadHeaderSettings() {
      const { data, error } = await supabase
        .from("homepage_settings")
        .select(
          "header_logo_url, header_site_name, header_tagline, header_logo_height, header_site_name_font_size, header_tagline_font_size, header_menu_font_size, header_menu_gap"
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load header settings:", error);
        return;
      }

      if (!mounted) return;

      setHeaderSettings({
        header_logo_url:
          data?.header_logo_url ?? fallbackHeader.header_logo_url,
        header_site_name:
          data?.header_site_name ?? fallbackHeader.header_site_name,
        header_tagline:
          data?.header_tagline ?? fallbackHeader.header_tagline,
        header_logo_height:
          data?.header_logo_height ?? fallbackHeader.header_logo_height,
        header_site_name_font_size:
          data?.header_site_name_font_size ??
          fallbackHeader.header_site_name_font_size,
        header_tagline_font_size:
          data?.header_tagline_font_size ??
          fallbackHeader.header_tagline_font_size,
        header_menu_font_size:
          data?.header_menu_font_size ?? fallbackHeader.header_menu_font_size,
        header_menu_gap:
          data?.header_menu_gap ?? fallbackHeader.header_menu_gap,
      });
    }

    async function loadAuthState() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsLoggedIn(!!data.session);
      setLoadingAuth(false);
    }

    async function loadPageVisibility() {
      const { data, error } = await supabase
        .from("site_page_settings")
        .select("page_key, title, is_visible, show_in_menu")
        .eq("is_visible", true)
        .eq("show_in_menu", true);

      if (error || !data || data.length === 0) {
        if (error) {
          console.error("Failed to load site_page_settings:", error);
        }
        return;
      }

      if (!mounted) return;

      const publicOnly = (data as SitePageSetting[])
        .filter(
          (row) =>
            row.page_key !== "register_team" &&
            row.page_key !== "register_player"
        )
        .map((row) => ({
          name:
            row.title ||
            row.page_key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          href: mapPageKeyToHref(row.page_key),
        }));

      if (publicOnly.length > 0) {
        setPublicNavItems(publicOnly);
      }
    }

    loadHeaderSettings();
    loadAuthState();
    loadPageVisibility();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(!!session);
      setLoadingAuth(false);
    });

    function handleOutsideClick(event: MouseEvent) {
      if (
        registerRef.current &&
        !registerRef.current.contains(event.target as Node)
      ) {
        setRegisterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const siteName =
    headerSettings.header_site_name || fallbackHeader.header_site_name;
  const tagline =
    headerSettings.header_tagline || fallbackHeader.header_tagline;
  const logoUrl =
    headerSettings.header_logo_url || fallbackHeader.header_logo_url;
  const logoHeight =
    headerSettings.header_logo_height || fallbackHeader.header_logo_height;

  const siteNameSize =
    headerSettings.header_site_name_font_size ||
    fallbackHeader.header_site_name_font_size;

  const taglineSize =
    headerSettings.header_tagline_font_size ||
    fallbackHeader.header_tagline_font_size;

  const menuFontSize =
    headerSettings.header_menu_font_size ||
    fallbackHeader.header_menu_font_size;

  const menuGap =
    headerSettings.header_menu_gap || fallbackHeader.header_menu_gap;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-4">
          <a href="/" className="flex min-w-0 flex-1 items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="shrink-0 object-contain"
                style={{
                  height: `clamp(46px, 7vw, ${logoHeight}px)`,
                  width: "auto",
                }}
              />
            ) : null}

            <div className="min-w-0">
              <p
                className="truncate font-semibold uppercase text-emerald-700"
                style={{
                  fontSize: `clamp(12px, 1.8vw, ${siteNameSize}px)`,
                  letterSpacing: "0.18em",
                }}
              >
                {siteName}
              </p>
              <h1
                className="truncate font-bold text-slate-900"
                style={{
                  fontSize: `clamp(11px, 1.9vw, ${taglineSize}px)`,
                  lineHeight: 1.2,
                }}
              >
                {tagline}
              </h1>
            </div>
          </a>

          <nav
            className="hidden items-center xl:flex"
            style={{ gap: `${menuGap}px` }}
          >
            {publicNavItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="whitespace-nowrap font-medium text-slate-700 transition hover:text-emerald-700"
                style={{ fontSize: `${menuFontSize}px` }}
              >
                {item.name}
              </a>
            ))}

            {!loadingAuth &&
              (isLoggedIn ? (
                <>
                  <div className="relative" ref={registerRef}>
                    <button
                      type="button"
                      onClick={() => setRegisterOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Register
                      <span className="text-xs">{registerOpen ? "▲" : "▼"}</span>
                    </button>

                    {registerOpen ? (
                      <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                        <a
                          href="/register/team"
                          className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                        >
                          Register Team
                        </a>
                        <a
                          href="/register/player"
                          className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                        >
                          Register Player
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <a
                    href="/dashboard"
                    className="whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    My Dashboard
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <a
                  href="/login?next=/dashboard"
                  className="whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Login / Join
                </a>
              ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 xl:hidden"
          >
            Menu
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-slate-200 py-3 xl:hidden">
            <div className="flex flex-col gap-2">
              {publicNavItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                >
                  {item.name}
                </a>
              ))}

              {!loadingAuth &&
                (isLoggedIn ? (
                  <>
                    <div className="mt-2 rounded-2xl border border-slate-200 p-2">
                      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Register
                      </p>
                      <a
                        href="/register/team"
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                      >
                        Register Team
                      </a>
                      <a
                        href="/register/player"
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                      >
                        Register Player
                      </a>
                    </div>

                    <a
                      href="/dashboard"
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                    >
                      My Dashboard
                    </a>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <a
                    href="/login?next=/dashboard"
                    className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                  >
                    Login / Join
                  </a>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}