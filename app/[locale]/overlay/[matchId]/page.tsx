import CricketScoreOverlay from "@/components/overlay/CricketScoreOverlay";

export const dynamic = "force-dynamic";

type Scene = "auto" | "live" | "scorebug" | "intro" | "full";
type Position = "bottom-center" | "top-center" | "bottom-left" | "bottom-right" | "top-left" | "top-right";
type EventType = "none" | "four" | "six" | "wicket";

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale?: string; matchId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { matchId } = await params;
  const query = searchParams ? await searchParams : {};
  const get = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const manual = {
    striker: get("striker"),
    strikerRuns: get("sr"),
    strikerBalls: get("sb"),
    nonStriker: get("non"),
    nonStrikerRuns: get("nr"),
    nonStrikerBalls: get("nb"),
    bowler: get("bowler"),
    bowlerOvers: get("bo"),
    bowlerRuns: get("br"),
    bowlerWickets: get("bw"),
    thisOver: get("balls"),
    projected: get("proj"),
    target: get("target"),
    need: get("need"),
    rrr: get("rrr"),
    partnership: get("partnership"),
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-transparent">
      <CricketScoreOverlay
        matchId={matchId}
        scene={(get("scene") as Scene) || "auto"}
        position={(get("position") as Position) || "bottom-center"}
        scale={Number(get("scale") || "1")}
        event={(get("event") as EventType) || "none"}
        showOverSummary={get("summary") !== "off"}
        
      />
    </main>
  );
}
