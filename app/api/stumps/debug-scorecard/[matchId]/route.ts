import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;

    const url = `https://api.stumpsapp.com/matches/id/${matchId}/scorecard`;

    const res = await fetch(url, {
      headers: {
        apiKey: process.env.STUMPS_API_KEY || "",
        Token: process.env.STUMPS_TOKEN || "",
      },
      cache: "no-store",
    });

    const rawText = await res.text();

    let parsed = null;

    try {
      parsed = JSON.parse(rawText);
    } catch {}

    return NextResponse.json({
      success: true,
      matchId,
      requestedUrl: url,
      status: res.status,
      statusText: res.statusText,
      rawText,
      parsed,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}