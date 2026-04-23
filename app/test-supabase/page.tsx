import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("title, slug, status")
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-bold">Supabase Connection Test</h1>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Error loading data</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.map((item) => (
              <div
                key={item.slug}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">Slug: {item.slug}</p>
                <p className="mt-1 text-sm text-slate-600">Status: {item.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}