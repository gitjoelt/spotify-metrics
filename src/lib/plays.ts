import { getDb, run, all, persist } from "@/lib/db";
import { spotifyTrackUrl, spotifySearchUrl } from "@/lib/format";

export interface PlayInput {
  playedAt: string; // ISO 8601
  trackUri: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  durationMs: number;
  msPlayed: number;
  source: "import" | "live";
}

export async function insertPlays(entries: PlayInput[]): Promise<{ inserted: number; skipped: number }> {
  if (entries.length === 0) return { inserted: 0, skipped: 0 };
  const db = await getDb();
  let inserted = 0;

  db.run("BEGIN TRANSACTION");
  try {
    for (const e of entries) {
      run(
        db,
        `INSERT OR IGNORE INTO plays
          (played_at, track_uri, track_name, artist_name, album_name, duration_ms, ms_played, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.playedAt,
          e.trackUri,
          e.trackName,
          e.artistName,
          e.albumName,
          e.durationMs,
          e.msPlayed,
          e.source,
        ],
      );
      // sqlite3_changes() reports rows touched by the statement that just
      // ran (0 if INSERT OR IGNORE hit the unique constraint, 1 if it inserted).
      if (db.getRowsModified() > 0) inserted += 1;
    }
    db.run("COMMIT");
  } catch (err) {
    db.run("ROLLBACK");
    throw err;
  }

  persist(db);
  return { inserted, skipped: entries.length - inserted };
}

export interface StatsFilter {
  year?: number;
  month?: number; // 1-12, requires year
}

function buildWhere(filter: StatsFilter): { clause: string; params: (string | number)[] } {
  const params: (string | number)[] = [];
  const conds: string[] = [];
  if (filter.year) {
    conds.push("strftime('%Y', played_at) = ?");
    params.push(String(filter.year));
  }
  if (filter.year && filter.month) {
    conds.push("strftime('%m', played_at) = ?");
    params.push(String(filter.month).padStart(2, "0"));
  }
  return {
    clause: conds.length ? `WHERE ${conds.join(" AND ")}` : "",
    params,
  };
}

export interface SummaryStats {
  totalMsPlayed: number;
  totalPlays: number;
  uniqueTracks: number;
  uniqueArtists: number;
}

export async function getSummary(filter: StatsFilter = {}): Promise<SummaryStats> {
  const db = await getDb();
  const { clause, params } = buildWhere(filter);
  const row = all<{
    total_ms: number | null;
    total_plays: number;
    unique_tracks: number;
    unique_artists: number;
  }>(
    db,
    `SELECT
       COALESCE(SUM(ms_played), 0) AS total_ms,
       COUNT(*) AS total_plays,
       COUNT(DISTINCT track_uri) AS unique_tracks,
       COUNT(DISTINCT artist_name) AS unique_artists
     FROM plays ${clause}`,
    params,
  )[0];

  return {
    totalMsPlayed: row?.total_ms ?? 0,
    totalPlays: row?.total_plays ?? 0,
    uniqueTracks: row?.unique_tracks ?? 0,
    uniqueArtists: row?.unique_artists ?? 0,
  };
}

export interface TopItem {
  name: string;
  href: string | null;
  artistName?: string;
  artistHref?: string | null;
  plays: number;
  msPlayed: number;
}

export async function getTopTracks(filter: StatsFilter = {}, limit = 10): Promise<TopItem[]> {
  const db = await getDb();
  const { clause, params } = buildWhere(filter);
  return all<{
    track_name: string;
    track_uri: string;
    artist_name: string;
    plays: number;
    ms_played: number;
  }>(
    db,
    `SELECT track_name, track_uri, artist_name, COUNT(*) AS plays, SUM(ms_played) AS ms_played
     FROM plays ${clause}
     GROUP BY track_uri
     ORDER BY plays DESC, ms_played DESC
     LIMIT ?`,
    [...params, limit],
  ).map((r) => ({
    name: r.track_name,
    href: spotifyTrackUrl(r.track_uri),
    artistName: r.artist_name,
    artistHref: spotifySearchUrl(r.artist_name),
    plays: r.plays,
    msPlayed: r.ms_played,
  }));
}

export async function getTopArtists(filter: StatsFilter = {}, limit = 10): Promise<TopItem[]> {
  const db = await getDb();
  const { clause, params } = buildWhere(filter);
  return all<{ artist_name: string; plays: number; ms_played: number }>(
    db,
    `SELECT artist_name, COUNT(*) AS plays, SUM(ms_played) AS ms_played
     FROM plays ${clause}
     GROUP BY artist_name
     ORDER BY ms_played DESC, plays DESC
     LIMIT ?`,
    [...params, limit],
  ).map((r) => ({
    name: r.artist_name,
    href: spotifySearchUrl(r.artist_name),
    plays: r.plays,
    msPlayed: r.ms_played,
  }));
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  minutes: number;
  plays: number;
}

export async function getMonthlyTotals(year?: number): Promise<MonthlyTotal[]> {
  const db = await getDb();
  const { clause, params } = buildWhere(year ? { year } : {});
  return all<{ month: string; ms_played: number; plays: number }>(
    db,
    `SELECT strftime('%Y-%m', played_at) AS month,
            SUM(ms_played) AS ms_played,
            COUNT(*) AS plays
     FROM plays ${clause}
     GROUP BY month
     ORDER BY month ASC`,
    params,
  ).map((r) => ({
    month: r.month,
    minutes: Math.round(r.ms_played / 60000),
    plays: r.plays,
  }));
}

export async function getAvailableYears(): Promise<number[]> {
  const db = await getDb();
  return all<{ year: string }>(
    db,
    `SELECT DISTINCT strftime('%Y', played_at) AS year FROM plays ORDER BY year DESC`,
  ).map((r) => Number(r.year));
}

export async function getPlayCount(): Promise<number> {
  const db = await getDb();
  const row = all<{ count: number }>(db, "SELECT COUNT(*) AS count FROM plays")[0];
  return row?.count ?? 0;
}
