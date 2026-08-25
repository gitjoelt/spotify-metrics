import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, fetchProfile, saveTokens } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("spotify_oauth_state")?.value;
  cookieStore.delete("spotify_oauth_state");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorParam)}`, request.url),
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const profile = await fetchProfile(tokens.access_token);
    await saveTokens(tokens, profile);
  } catch (err) {
    console.error("Spotify OAuth callback failed", err);
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
  }

  return NextResponse.redirect(new URL("/?connected=1", request.url));
}
