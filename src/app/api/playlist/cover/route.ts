import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, searchArtistImageUrl } from "@/lib/spotify";
import { buildPlaylistCoverImage } from "@/lib/playlistCover";
import { getTopTracks } from "@/lib/plays";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const artistParam = searchParams.get("artist") ?? undefined;

  try {
    const accessToken = await getValidAccessToken();

    let coverArtist = artistParam;
    if (!coverArtist) {
      const top = await getTopTracks({ year }, 1);
      coverArtist = top[0]?.artistName;
    }
    if (!coverArtist) {
      return NextResponse.json({ error: "No artist found" }, { status: 404 });
    }

    const imageUrl = await searchArtistImageUrl(accessToken, coverArtist);
    if (!imageUrl) {
      return NextResponse.json({ error: "No artist image found" }, { status: 404 });
    }

    const cover = await buildPlaylistCoverImage(imageUrl);
    return new NextResponse(new Uint8Array(cover), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
