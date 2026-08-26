import Link from "next/link";
import { notFound } from "next/navigation";
import { getSummary, getTopTracks } from "@/lib/plays";
import { isAuthenticated } from "@/lib/spotify";
import { formatDuration, formatNumber, spotifySearchUrl } from "@/lib/format";
import CreatePlaylistButton from "@/components/CreatePlaylistButton";

const LIMIT = 1000;

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ artist: string }>;
}) {
  const { artist: encodedArtist } = await params;
  const artistName = decodeURIComponent(encodedArtist);

  const [summary, tracks, connected] = await Promise.all([
    getSummary({ artist: artistName }),
    getTopTracks({ artist: artistName }, LIMIT),
    isAuthenticated(),
  ]);

  if (summary.totalPlays === 0) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{artistName}</h1>
          <a
            href={spotifySearchUrl(artistName)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-accent hover:text-accent-hover hover:underline"
          >
            Open on Spotify →
          </a>
        </div>
        <Link
          href="/"
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Back to dashboard
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Listening time" value={formatDuration(summary.totalMsPlayed)} />
        <StatCard label="Total plays" value={formatNumber(summary.totalPlays)} />
        <StatCard label="Unique tracks" value={formatNumber(summary.uniqueTracks)} />
      </div>

      {tracks.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          {connected ? (
            <CreatePlaylistButton filter={{ artist: artistName }} trackCount={tracks.length} />
          ) : (
            <p className="text-sm text-text-tertiary">
              <a href="/api/auth/login" className="font-medium text-accent hover:text-accent-hover">
                Connect with Spotify
              </a>{" "}
              to create a playlist from these tracks.
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Track</th>
              <th className="px-4 py-3 text-right font-semibold">Plays</th>
              <th className="px-4 py-3 text-right font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, idx) => (
              <tr
                key={track.uri ?? `${track.name}-${idx}`}
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
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}
