import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js", "sharp"],
  // The Spotify OAuth redirect URI is registered against 127.0.0.1, but the
  // dev server binds to localhost — without this, HMR/static chunk requests
  // from 127.0.0.1 get blocked as cross-origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
