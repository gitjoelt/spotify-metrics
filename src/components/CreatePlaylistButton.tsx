"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export default function CreatePlaylistButton({
  filter,
  trackCount,
}: {
  filter: { year?: number; artist?: string };
  trackCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; url: string; count: number; coverWarning?: string }
    | { ok: false; error: string; needsReauth?: boolean }
    | null
  >(null);

  const previewSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (filter.year) params.set("year", String(filter.year));
    if (filter.artist) params.set("artist", filter.artist);
    return `/api/playlist/cover?${params.toString()}`;
  }, [filter.year, filter.artist]);

  async function createPlaylist() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filter),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResult({ ok: false, error: data.error ?? res.statusText, needsReauth: data.needsReauth });
      } else {
        setResult({ ok: true, url: data.url, count: data.count, coverWarning: data.coverWarning });
      }
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {!previewFailed && (
        <div className="flex shrink-0 items-center gap-3">
          <Image
            src={previewSrc}
            alt="Playlist cover preview"
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 rounded-lg border border-border-strong object-cover"
            onError={() => setPreviewFailed(true)}
          />
          <p className="max-w-36 text-xs leading-snug text-text-tertiary">
            Will be set as the playlist cover
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={createPlaylist}
          disabled={loading || trackCount === 0}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Creating playlist…" : `Create playlist from these ${trackCount} tracks`}
        </button>

        {result?.ok && (
          <div className="flex flex-col gap-1">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent hover:text-accent-hover hover:underline"
            >
              Open playlist ({result.count} tracks) →
            </a>
            {result.coverWarning && (
              <span className="text-xs text-warning">
                {result.coverWarning}
                {result.coverWarning.includes("reconnect") && (
                  <>
                    {" "}
                    <a href="/api/auth/login" className="font-medium underline underline-offset-2">
                      Reconnect now
                    </a>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {result && !result.ok && (
          <span className="text-sm text-danger">
            {result.error}
            {result.needsReauth && (
              <>
                {" — "}
                <a href="/api/auth/login" className="font-medium underline underline-offset-2">
                  reconnect Spotify
                </a>{" "}
                to grant playlist permission.
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
