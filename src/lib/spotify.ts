import { getDb, run, get, persist } from "@/lib/db";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export const SCOPES = [
  "user-read-recently-played",
  "user-read-email",
  "user-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "ugc-image-upload",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getRedirectUri(): string {
  return requireEnv("SPOTIFY_REDIRECT_URI");
}

export function getAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("SPOTIFY_CLIENT_ID"),
    scope: SCOPES,
    redirect_uri: getRedirectUri(),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

interface SpotifyProfile {
  id: string;
  display_name: string | null;
}

export async function fetchProfile(accessToken: string): Promise<SpotifyProfile> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`);
  return res.json() as Promise<SpotifyProfile>;
}

export async function saveTokens(
  tokens: TokenResponse,
  profile?: SpotifyProfile,
): Promise<void> {
  const db = await getDb();
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  const existing = get<{ refresh_token: string }>(
    db,
    "SELECT refresh_token FROM auth_tokens WHERE id = 1",
  );
  const refreshToken = tokens.refresh_token ?? existing?.refresh_token;
  if (!refreshToken) {
    throw new Error("No refresh token available to store");
  }

  run(
    db,
    `INSERT INTO auth_tokens (id, access_token, refresh_token, expires_at, spotify_user_id, display_name)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       spotify_user_id = COALESCE(excluded.spotify_user_id, auth_tokens.spotify_user_id),
       display_name = COALESCE(excluded.display_name, auth_tokens.display_name)`,
    [
      tokens.access_token,
      refreshToken,
      expiresAt,
      profile?.id ?? null,
      profile?.display_name ?? null,
    ],
  );
  persist(db);
}

export async function isAuthenticated(): Promise<boolean> {
  const db = await getDb();
  const row = get<{ id: number }>(db, "SELECT id FROM auth_tokens WHERE id = 1");
  return !!row;
}

export async function getAccountInfo(): Promise<{ displayName: string | null } | null> {
  const db = await getDb();
  const row = get<{ display_name: string | null }>(
    db,
    "SELECT display_name FROM auth_tokens WHERE id = 1",
  );
  if (!row) return null;
  return { displayName: row.display_name };
}

export async function getValidAccessToken(): Promise<string> {
  const db = await getDb();
  const row = get<{ access_token: string; refresh_token: string; expires_at: number }>(
    db,
    "SELECT access_token, refresh_token, expires_at FROM auth_tokens WHERE id = 1",
  );
  if (!row) throw new Error("Not connected to Spotify yet");

  const bufferMs = 60_000;
  if (Date.now() < row.expires_at - bufferMs) {
    return row.access_token;
  }

  const refreshed = await refreshAccessToken(row.refresh_token);
  await saveTokens(refreshed);
  return refreshed.access_token;
}

export interface RecentlyPlayedItem {
  played_at: string;
  track: {
    uri: string;
    name: string;
    duration_ms: number;
    album: { name: string };
    artists: { name: string }[];
  };
}

export async function fetchRecentlyPlayed(
  accessToken: string,
): Promise<RecentlyPlayedItem[]> {
  const res = await fetch(`${API_BASE}/me/player/recently-played?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch recently played (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { items: RecentlyPlayedItem[] };
  return json.items;
}

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public insufficientScope: boolean,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

export interface CreatedPlaylist {
  id: string;
  url: string;
}

export async function createPlaylist(
  accessToken: string,
  name: string,
  description: string,
): Promise<CreatedPlaylist> {
  // POST /users/{user_id}/playlists was removed for Development Mode apps in
  // Spotify's February 2026 Web API migration; /me/playlists replaces it.
  const res = await fetch(`${API_BASE}/me/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description, public: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    const insufficientScope = (res.headers.get("www-authenticate") ?? "").includes(
      "insufficient_scope",
    );
    throw new SpotifyApiError(
      `Failed to create playlist (${res.status}): ${text}`,
      res.status,
      insufficientScope,
    );
  }
  const json = (await res.json()) as { id: string; external_urls: { spotify: string } };
  return { id: json.id, url: json.external_urls.spotify };
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[],
): Promise<void> {
  const CHUNK = 100; // Spotify API limit per request
  for (let i = 0; i < trackUris.length; i += CHUNK) {
    const chunk = trackUris.slice(i, i + CHUNK);
    // /playlists/{id}/tracks was renamed to /playlists/{id}/items in the same migration.
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: chunk }),
    });
    if (!res.ok) {
      const text = await res.text();
      const insufficientScope = (res.headers.get("www-authenticate") ?? "").includes(
        "insufficient_scope",
      );
      throw new SpotifyApiError(
        `Failed to add tracks to playlist (${res.status}): ${text}`,
        res.status,
        insufficientScope,
      );
    }
  }
}

export async function searchArtistImageUrl(
  accessToken: string,
  artistName: string,
): Promise<string | null> {
  const res = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    artists?: { items: { images: { url: string }[] }[] };
  };
  return json.artists?.items?.[0]?.images?.[0]?.url ?? null;
}

export async function setPlaylistCoverImage(
  accessToken: string,
  playlistId: string,
  jpeg: Buffer,
): Promise<void> {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/images`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/jpeg",
    },
    body: jpeg.toString("base64"),
  });
  if (!res.ok) {
    const text = await res.text();
    // This endpoint doesn't set a WWW-Authenticate challenge header even for
    // a genuine missing-scope rejection — it only shows up in the JSON body.
    const insufficientScope =
      (res.headers.get("www-authenticate") ?? "").includes("insufficient_scope") ||
      /insufficient.*scope/i.test(text);
    throw new SpotifyApiError(
      `Failed to set playlist cover (${res.status}): ${text}`,
      res.status,
      insufficientScope,
    );
  }
}

export async function disconnect(): Promise<void> {
  const db = await getDb();
  run(db, "DELETE FROM auth_tokens WHERE id = 1");
  persist(db);
}
