import Link from "next/link";
import { Suspense } from "react";
import { isAuthenticated, getAccountInfo } from "@/lib/spotify";
import {
  getSummary,
  getTopTracks,
  getTopArtists,
  getMonthlyTotals,
  getAvailableYears,
  getPlayCount,
} from "@/lib/plays";
import { formatDuration, formatNumber, MONTH_NAMES } from "@/lib/format";
import YearMonthFilter from "@/components/YearMonthFilter";
import SyncButton from "@/components/SyncButton";
import MonthlyChart from "@/components/MonthlyChart";
import TopList from "@/components/TopList";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const connected = await isAuthenticated();
  const totalPlaysStored = await getPlayCount();

  if (!connected && totalPlaysStored === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Spotify Listening History
        </h1>
        <p className="max-w-md text-base leading-relaxed text-text-secondary">
          Connect your Spotify account to track new plays, or import your full streaming history
          to see what you listen to, how much, and how it breaks down by month and year.
        </p>
        {params.error && (
          <p className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-2 text-sm text-danger">
            Connection failed: {params.error}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <a
            href="/api/auth/login"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Connect with Spotify
          </a>
          <Link
            href="/import"
            className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover"
          >
            Import history
          </Link>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          Open this app at 127.0.0.1, not localhost — Spotify only allows the exact redirect URI
          it was registered with.
        </p>
      </div>
    );
  }

  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;
  const filter = { year, month };

  const [account, summary, topTracks, topArtists, monthly, years] = await Promise.all([
    getAccountInfo(),
    getSummary(filter),
    getTopTracks(filter, 10),
    getTopArtists(filter, 10),
    getMonthlyTotals(year),
    getAvailableYears(),
  ]);

  const rangeLabel = year
    ? month
      ? `${MONTH_NAMES[month - 1]} ${year}`
      : `${year}`
    : "All time";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Spotify Listening History
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            {account?.displayName ? `Connected as ${account.displayName}` : "Not connected"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <Suspense fallback={null}>
              <SyncButton />
            </Suspense>
          ) : (
            <a
              href="/api/auth/login"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Connect with Spotify
            </a>
          )}
          <Link
            href="/import"
            className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            Import history
          </Link>
          {connected && (
            <form action="/api/auth/logout" method="POST">
              <button className="rounded-full px-3 py-2 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary">
                Disconnect
              </button>
            </form>
          )}
        </div>
      </header>

      {!connected && (
        <Callout tone="neutral">
          Not connected — showing imported history only.{" "}
          <a href="/api/auth/login" className="font-medium text-accent hover:text-accent-hover">
            Connect with Spotify
          </a>{" "}
          to keep tracking new plays automatically.
        </Callout>
      )}

      {totalPlaysStored === 0 && (
        <Callout tone="warning">
          No listening data yet. Click <strong className="font-semibold">Sync now</strong> to
          pull your recent plays, or{" "}
          <Link href="/import" className="font-medium text-warning underline underline-offset-2">
            import your full Spotify streaming history
          </Link>{" "}
          for complete stats going back years.
        </Callout>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          {rangeLabel}
        </h2>
        <Suspense fallback={null}>
          <YearMonthFilter years={years} />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Listening time" value={formatDuration(summary.totalMsPlayed)} />
        <StatCard label="Total plays" value={formatNumber(summary.totalPlays)} />
        <StatCard label="Unique tracks" value={formatNumber(summary.uniqueTracks)} />
        <StatCard label="Unique artists" value={formatNumber(summary.uniqueArtists)} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          {year ? `Minutes listened in ${year}` : "Minutes listened by month"}
        </h2>
        <MonthlyChart data={monthly} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopList title={`Top tracks — ${rangeLabel}`} items={topTracks} showArtist />
        <TopList title={`Top artists — ${rangeLabel}`} items={topArtists} />
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

function Callout({ tone, children }: { tone: "neutral" | "warning"; children: React.ReactNode }) {
  if (tone === "warning") {
    return (
      <div className="rounded-xl border border-warning/25 bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning">
        {children}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-secondary">
      {children}
    </div>
  );
}
