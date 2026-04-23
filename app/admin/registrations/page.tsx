import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import { supabase } from "@/utils/supabase/client";
import AdminNav from "@/components/admin/admin-nav";

export default async function AdminRegistrationsPage() {
  const { data: teams } = await supabase
    .from("registration_teams")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: players } = await supabase
    .from("registration_players")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
	  <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Admin – Registrations</h1>

        {/* TEAM REGISTRATIONS */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Team Registrations</h2>

          <div className="overflow-x-auto bg-white rounded-2xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="p-3">Team</th>
                  <th className="p-3">Captain</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Tournament</th>
                </tr>
              </thead>
              <tbody>
                {teams?.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">{t.team_name}</td>
                    <td className="p-3">{t.captain_name}</td>
                    <td className="p-3">{t.phone}</td>
                    <td className="p-3">{t.city}</td>
                    <td className="p-3">{t.tournament}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PLAYER REGISTRATIONS */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Player Registrations</h2>

          <div className="overflow-x-auto bg-white rounded-2xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">City</th>
                </tr>
              </thead>
              <tbody>
                {players?.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.full_name}</td>
                    <td className="p-3">{p.phone}</td>
                    <td className="p-3">{p.role}</td>
                    <td className="p-3">{p.current_team}</td>
                    <td className="p-3">{p.city_base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}