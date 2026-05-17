import CricketScoreOverlay from "@/components/overlay/CricketScoreOverlay";

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; matchId: string }>;
  searchParams?: Promise<{ variant?: string }>;
}) {
  const { matchId } = await params;
  const query = searchParams ? await searchParams : {};
  const variant =
    query?.variant === "scorebug" || query?.variant === "full"
      ? query.variant
      : "lower-third";

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      <CricketScoreOverlay matchId={matchId} variant={variant} />
    </main>
  );
}
