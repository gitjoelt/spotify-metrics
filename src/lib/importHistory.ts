import type { PlayInput } from "@/lib/plays";

interface ExtendedHistoryEntry {
  ts?: string;
  endTime?: string; // very old export format
  ms_played?: number;
  msPlayed?: number; // very old export format
  master_metadata_track_name?: string | null;
  trackName?: string | null; // very old export format
  master_metadata_album_artist_name?: string | null;
  artistName?: string | null; // very old export format
  master_metadata_album_album_name?: string | null;
  spotify_track_uri?: string | null;
  episode_name?: string | null;
}

/**
 * Parses one JSON file from a Spotify "Extended Streaming History" export
 * (files named like Streaming_History_Audio_*.json or endsong_*.json).
 * Podcast episodes and entries missing a track URI are skipped.
 */
export function parseExtendedHistoryFile(jsonText: string): PlayInput[] {
  const raw = JSON.parse(jsonText) as ExtendedHistoryEntry[];
  if (!Array.isArray(raw)) {
    throw new Error("Expected a JSON array of streaming history entries");
  }

  const out: PlayInput[] = [];
  for (const entry of raw) {
    if (entry.episode_name) continue; // podcast, skip

    const trackUri = entry.spotify_track_uri;
    const trackName = entry.master_metadata_track_name ?? entry.trackName;
    const artistName = entry.master_metadata_album_artist_name ?? entry.artistName;
    const playedAt = entry.ts ?? entry.endTime;
    const msPlayed = entry.ms_played ?? entry.msPlayed;

    if (!trackUri || !trackName || !artistName || !playedAt || msPlayed == null) {
      continue;
    }

    out.push({
      playedAt,
      trackUri,
      trackName,
      artistName,
      albumName: entry.master_metadata_album_album_name ?? null,
      durationMs: msPlayed,
      msPlayed,
      source: "import",
    });
  }
  return out;
}
