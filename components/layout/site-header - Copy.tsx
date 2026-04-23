"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

const publicNavItems = [
  { name: "Home", href: "/" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Rankings", href: "/rankings" },
  { name: "Teams", href: "/teams" },
  { name: "Players", href: "/players" },
  { name: "Media", href: "/media" },
  { name: "History", href: "/history" },
];

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

const fallbackHeader: Required<HeaderSettings> = {
  header_logo_url: "",
  header_site_name: "Cricket Community Egypt",
  header_tagline: "Uniting Cricket Enthusiasts",
  header_logo_height: 40,
  header_site_name_font_size: 11,
  header_tagline_font_size: 16,
  header_menu_font_size: 14,
  header_menu_gap: 20,
};

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSettings, setHeaderSettings] =
    useState<HeaderSettings>(fallbackHeader);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

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

    loadHeaderSettings();
    loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(!!session);
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
        <div className="flex min-h-[70px] items-center justify-between gap-3 sm:min-h-[78px] sm:gap-4">
          <a href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="shrink-0 object-contain"
                style={{
                  height: `clamp(44px, 8vw, ${logoHeight}px)`,
                  width: "auto",
                }}
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <p
                className="truncate font-semibold uppercase text-emerald-700"
                style={{
                  fontSize: `clamp(12px, 2.5vw, ${siteNameSize}px)`,
                  letterSpacing: "0.18em",
                }}
              >
                {siteName}
              </p>
              <h1
                className="truncate font-bold text-slate-900"
                style={{
                  fontSize: `clamp(11px, 2.8vw, ${taglineSize}px)`,
                  lineHeight: 1.2,
                }}
              >
                {tagline}
              </h1>
            </div>
          </a>

          <nav
            className="hidden items-center md:flex"
            style={{ gap: `${menuGap}px` }}
          >
            {publicNavItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="font-medium text-slate-700 transition hover:text-emerald-700"
                style={{ fontSize: `${menuFontSize}px` }}
              >
                {item.name}
              </a>
            ))}

            {!loadingAuth &&
              (isLoggedIn ? (
                <>
                  <a
                    href="/register/team"
                    className="font-medium text-slate-700 transition hover:text-emerald-700"
                    style={{ fontSize: `${menuFontSize}px` }}
                  >
                    Register Team
                  </a>
                  <a
                    href="/register/player"
                    className="font-medium text-slate-700 transition hover:text-emerald-700"
                    style={{ fontSize: `${menuFontSize}px` }}
                  >
                    Register Player
                  </a>
                  <a
                    href="/dashboard"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    My Dashboard
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <a
                  href="/login?next=/dashboard"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Login / Join
                </a>
              ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden"
          >
            Menu
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 py-3 md:hidden">
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
                    <a
                      href="/register/team"
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                    >
                      Register Team
                    </a>
                    <a
                      href="/register/player"
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                    >
                      Register Player
                    </a>
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
        )}
      </div>
    </header>
  );
}