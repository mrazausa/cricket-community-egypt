import { NextResponse } from "next/server";

const CLUB_ID = process.env.STUMPS_CLUB_ID;
const API_KEY = process.env.STUMPS_API_KEY;
const TOKEN = process.env.STUMPS_TOKEN;

function normalizeStatus(status?: string) {
  return String(status || "").toLowerCase().trim();
}

export async function GET() {
  try {
    const res = await fetch(
      `https://api.stumpsapp.com/api/v1/clubs/${CLUB_ID}/matches`,
      {
        headers: {
          "x-api-key": API_KEY || "",
          Authorization: `Bearer ${TOKEN || ""}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { liveMatches: [], upcomingMatches: [], error: "STUMPS matches fetch failed" },
        { status: 200 }
      );
    }

    const data = await res.json();
    const matches = Array.isArray(data) ? data : data?.matches || [];

    const liveMatches = matches.filter((m: any) => {
      const status = normalizeStatus(m.matchStatus);
      return (
        status.includes("live") ||
        status.includes("started") ||
        status.includes("in progress")
      );
    });

    const upcomingMatches = matches.filter((m: any) => {
      const status = normalizeStatus(m.matchStatus);
      return (
        status.includes("upcoming") ||
        status.includes("scheduled") ||
        status.includes("not started")
      );
    });

    return NextResponse.json({
      liveMatches,
      upcomingMatches,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { liveMatches: [], upcomingMatches: [], error: "Live summary failed" },
      { status: 200 }
    );
  }
}