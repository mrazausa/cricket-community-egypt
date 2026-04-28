import type { Metadata } from "next";
import TournamentClient from "./TournamentClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Azhar Cricket Trophy 2026 | Cricket Community Egypt",
    description: "Premium cricket platform for Egypt",
    openGraph: {
      title: "Azhar Cricket Trophy 2026",
      description: "Fixtures, standings, teams, players and top performers.",
      url: "https://cricketcommunityegypt.org/tournaments/azhar-cricket-trophy-2026",
      siteName: "Cricket Community Egypt",
      images: [
        {
          url: "https://gcboqehagqylcnywrlpb.supabase.co/storage/v1/object/public/tournament-assets/azhar-2026-logo-transparent.png",
          width: 1200,
          height: 630,
          alt: "Azhar Cricket Trophy 2026",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Azhar Cricket Trophy 2026",
      description: "Fixtures, standings, teams, players and top performers.",
      images: [
        "https://gcboqehagqylcnywrlpb.supabase.co/storage/v1/object/public/tournament-assets/azhar-2026-logo-transparent.png",
      ],
    },
  };
}

export default function Page() {
  return <TournamentClient />;
}