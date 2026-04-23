"use client";

import { useEffect, useState } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { supabase } from "@/utils/supabase/client";
import AdminNav from "@/components/admin/admin-nav";

type SquadMemberRow = {
  id: string;
  registration_team_id: string;
  player_name: string;
  player_code: string | null;
  phone: string | null;
  notes: string | null;
  is_registered: boolean;
  player_id: string | null;
};

type PlayerRow = {
  id: string;
  name: string;
  player_code: string | null;
  slug: string;
};

export default function AdminTeamSquadLinkingPage() {
  const [members, setMembers] = useState<SquadMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadMembers() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("registration_team_squad_members")
      .select("*")
      .not("player_code", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setMembers([]);
    } else {
      setMembers((data || []) as SquadMemberRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function autoLinkMember(member: SquadMemberRow) {
    try {
      setProcessingId(member.id);
      setMessage("");
      setErrorMessage("");

      if (!member.player_code?.trim()) {
        throw new Error("This squad member does not have a player code.");
      }

      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, name, player_code, slug")
        .eq("player_code", member.player_code.trim())
        .maybeSingle();

      if (playerError) throw playerError;

      if (!player) {
        throw new Error(`No official player found for code ${member.player_code}.`);
      }

      const { error: updateError } = await supabase
        .from("registration_team_squad_members")
        .update({
          player_id: player.id,
          is_registered: true,
        })
        .eq("id", member.id);

      if (updateError) throw updateError;

      setMessage(
        `${member.player_name} successfully linked to official player ${player.name}.`
      );
      await loadMembers();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to auto-link squad member.");
    } finally {
      setProcessingId(null);
    }
  }

  async function unlinkMember(memberId: string, playerName: string) {
    try {
      setProcessingId(memberId);
      setMessage("");
      setErrorMessage("");

      const { error } = await supabase
        .from("registration_team_squad_members")
        .update({
          player_id: null,
          is_registered: false,
        })
        .eq("id", memberId);

      if (error) throw error;

      setMessage(`${playerName} has been unlinked from official player record.`);
      await loadMembers();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to unlink squad member.");
    } finally {
      setProcessingId(null);
    }
  }

  function renderStatus(member: SquadMemberRow) {
    if (member.is_registered && member.player_id) {
      return (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Linked
        </span>
      );
    }

    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Code Pending Link
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
	  <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold">Admin – Squad Code Linking</h1>
        <p className="mb-8 text-sm text-slate-600">
          Match squad members with official player profiles using system-generated player codes.
        </p>

        {message ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            Loading squad members with player codes...
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            No squad members with player codes found.
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold">{member.player_name}</h2>

                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-900">Player Code:</span>{" "}
                        {member.player_code || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Phone:</span>{" "}
                        {member.phone || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Notes:</span>{" "}
                        {member.notes || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Linked Player ID:</span>{" "}
                        {member.player_id || "-"}
                      </p>
                    </div>

                    <div>{renderStatus(member)}</div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!member.is_registered ? (
                      <button
                        type="button"
                        onClick={() => autoLinkMember(member)}
                        disabled={processingId === member.id}
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === member.id ? "Processing..." : "Auto Link"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => unlinkMember(member.id, member.player_name)}
                        disabled={processingId === member.id}
                        className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === member.id ? "Processing..." : "Unlink"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}