import { NextResponse } from "next/server";
import { fetchRecentlyPlayed, getValidAccessToken } from "@/lib/spotify";
import { insertPlays, type PlayInput } from "@/lib/plays";

export async function POST() {
  try {
    const accessToken = await getValidAccessToken();
    const items = await fetchRecentlyPlayed(accessToken);

    const entries: PlayInput[] = items.map((item) => ({
      playedAt: item.played_at,
      trackUri: item.track.uri,
      trackName: item.track.name,
      artistName: item.track.artists.map((a) => a.name).join(", "),
      albumName: item.track.album?.name ?? null,
      durationMs: item.track.duration_ms,
      msPlayed: item.track.duration_ms,
      source: "live",
    }));

    const result = await insertPlays(entries);
    return NextResponse.json({ ok: true, fetched: items.length, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
