import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
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

    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { rawText };
    }

    return NextResponse.json({
      success: res.ok,
      matchId,
      status: res.status,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to fetch scorecard",
    });
  }
}