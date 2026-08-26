import Link from "next/link";
import { Suspense } from "react";
import { getTopArtists, getAvailableYears } from "@/lib/plays";
import { formatDuration, formatNumber } from "@/lib/format";
import YearMonthFilter from "@/components/YearMonthFilter";

const LIMIT = 5000; // effectively "all" — no one has more distinct artists than this

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : undefined;

  const [artists, years] = await Promise.all([
    getTopArtists({ year }, LIMIT),
    getAvailableYears(),
  ]);

  const rangeLabel = year ? `${year}` : "All time";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">All artists</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            {rangeLabel === "All time"
              ? "Every artist across your entire history"
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
          {artists.length === 0 ? "No artists yet" : `${formatNumber(artists.length)} artists`}
        </h2>
        <Suspense fallback={null}>
          <YearMonthFilter years={years} basePath="/artists" showMonth={false} />
        </Suspense>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {artists.length === 0 ? (
          <p className="p-5 text-sm text-text-tertiary">Nothing here yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Artist</th>
                <th className="px-4 py-3 text-right font-semibold">Plays</th>
                <th className="px-4 py-3 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist, idx) => (
                <tr
                  key={artist.name}
                  className="border-b border-border/60 last:border-b-0 hover:bg-surface-hover"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-text-tertiary">
                    {idx + 1}
                  </td>
                  <td className="max-w-0 px-4 py-2.5">
                    {artist.href ? (
                      <Link
                        href={artist.href}
                        className="block truncate font-medium text-text-primary hover:text-accent hover:underline"
                      >
                        {artist.name}
                      </Link>
                    ) : (
                      <p className="truncate font-medium text-text-primary">{artist.name}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {formatNumber(artist.plays)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {formatDuration(artist.msPlayed)}
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
