import Link from "next/link";
import { Suspense } from "react";
import { getTopTracks, getAvailableYears } from "@/lib/plays";
import { isAuthenticated } from "@/lib/spotify";
import { formatDuration, formatNumber } from "@/lib/format";
import YearMonthFilter from "@/components/YearMonthFilter";
import CreatePlaylistButton from "@/components/CreatePlaylistButton";

const LIMIT = 500;

export default async function TopTracksPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : undefined;

  const [tracks, years, connected] = await Promise.all([
    getTopTracks({ year }, LIMIT),
    getAvailableYears(),
    isAuthenticated(),
  ]);

  const rangeLabel = year ? `${year}` : "All time";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Top {LIMIT} tracks
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            {rangeLabel === "All time"
              ? "Master list across your entire history"
              : `Ranked for ${rangeLabel}`}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Back to dashboard
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          {tracks.length === 0
            ? "No tracks yet"
            : `Showing ${formatNumber(tracks.length)} of up to ${formatNumber(LIMIT)}`}
        </h2>
        <Suspense fallback={null}>
          <YearMonthFilter years={years} basePath="/tracks" showMonth={false} />
        </Suspense>
      </div>

      {tracks.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          {connected ? (
            <CreatePlaylistButton filter={{ year }} trackCount={tracks.length} />
          ) : (
            <p className="text-sm text-text-tertiary">
              <a href="/api/auth/login" className="font-medium text-accent hover:text-accent-hover">
                Connect with Spotify
              </a>{" "}
              to create a playlist from this list.
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {tracks.length === 0 ? (
          <p className="p-5 text-sm text-text-tertiary">Nothing here yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Track</th>
                <th className="px-4 py-3 font-semibold">Artist</th>
                <th className="px-4 py-3 text-right font-semibold">Plays</th>
                <th className="px-4 py-3 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => (
                <tr
                  key={`${track.name}-${track.artistName ?? ""}-${idx}`}
                  className="border-b border-border/60 last:border-b-0 hover:bg-surface-hover"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-text-tertiary">
                    {idx + 1}
                  </td>
                  <td className="max-w-0 px-4 py-2.5">
                    {track.href ? (
                      <a
                        href={track.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate font-medium text-text-primary hover:text-accent hover:underline"
                      >
                        {track.name}
                      </a>
                    ) : (
                      <p className="truncate font-medium text-text-primary">{track.name}</p>
                    )}
                  </td>
                  <td className="max-w-0 px-4 py-2.5">
                    {track.artistHref ? (
                      <Link
                        href={track.artistHref}
                        className="block truncate text-text-secondary hover:text-accent hover:underline"
                      >
                        {track.artistName}
                      </Link>
                    ) : (
                      <p className="truncate text-text-secondary">{track.artistName}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {formatNumber(track.plays)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {formatDuration(track.msPlayed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
