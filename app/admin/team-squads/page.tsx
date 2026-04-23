"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";
import AdminNav from "@/components/admin/admin-nav";

type TeamRow = {
  id: string;
  team_name: string;
  captain_name: string | null;
  tournament: string | null;
  status: string;
};

type SquadRow = {
  id: string;
  registration_team_id: string;
  player_name: string;
  player_code: string | null;
  phone: string | null;
  notes: string | null;
  is_registered: boolean;
};

export default function AdminTeamSquadsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [squads, setSquads] = useState<SquadRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    const { data: teamData } = await supabase
      .from("registration_teams")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: squadData } = await supabase
      .from("registration_team_squad_members")
      .select("*");

    setTeams(teamData || []);
    setSquads(squadData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getSquadForTeam(teamId: string) {
    return squads.filter((s) => s.registration_team_id === teamId);
  }

  function getStatusTag(member: SquadRow) {
    if (member.player_code) {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
          Code Provided
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
        Unregistered
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
	  <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Admin – Team Squad Review</h1>

        {loading ? (
          <div className="bg-white p-6 rounded-2xl shadow">
            Loading squads...
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => {
              const squad = getSquadForTeam(team.id);

              return (
                <div
                  key={team.id}
                  className="bg-white rounded-3xl shadow p-5"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">{team.team_name}</h2>
                    <p className="text-sm text-slate-600">
                      Captain: {team.captain_name || "N/A"} | Tournament:{" "}
                      {team.tournament || "N/A"}
                    </p>
                  </div>

                  {squad.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No squad members added.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-left">
                          <tr>
                            <th className="p-3">Player Name</th>
                            <th className="p-3">Player Code</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Notes</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {squad.map((member) => (
                            <tr key={member.id} className="border-t">
                              <td className="p-3 font-medium">
                                {member.player_name}
                              </td>

                              <td className="p-3">
                                {member.player_code || "-"}
                              </td>

                              <td className="p-3">
                                {member.phone || "-"}
                              </td>

                              <td className="p-3">
                                {member.notes || "-"}
                              </td>

                              <td className="p-3">
                                {getStatusTag(member)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}