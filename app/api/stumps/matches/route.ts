import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clubId = process.env.STUMPS_CLUB_ID;
    const apiKey = process.env.STUMPS_API_KEY;
    const token = process.env.STUMPS_TOKEN;

    if (!clubId || !apiKey || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing STUMPS environment variables",
        },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://api.stumpsapp.com/clubs/id/${clubId}/matches`,
      {
        headers: {
          apiKey,
          Token: token,
        },
        cache: "no-store",
      }
    );

    const rawText = await res.text();

    let data: any = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch STUMPS matches",
      },
      { status: 500 }
    );
  }
}