import { getDb, run, get, persist } from "@/lib/db";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export const SCOPES = [
  "user-read-recently-played",
  "user-read-email",
  "user-read-private",
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

export async function disconnect(): Promise<void> {
  const db = await getDb();
  run(db, "DELETE FROM auth_tokens WHERE id = 1");
  persist(db);
}
