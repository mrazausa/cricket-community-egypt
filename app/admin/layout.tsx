"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkAdminAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login?next=/admin";
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || profile?.role !== "admin") {
        setAllowed(false);
        setChecking(false);
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAdminAccess();
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Checking admin access...
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md rounded-3xl bg-white p-6 text-center text-slate-900 shadow-xl">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-3 text-sm text-slate-600">
            You do not have permission to access the admin area.
          </p>
          <a
            href="/"
            className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}