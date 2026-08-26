import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { TopItem } from "@/lib/plays";

export default function TopList({
  title,
  items,
  showArtist,
}: {
  title: string;
  items: TopItem[];
  showArtist?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">Nothing here yet.</p>
      ) : (
        <ol className="space-y-1">
          {items.map((item, idx) => (
            <li
              key={`${item.name}-${item.artistName ?? ""}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-text-tertiary">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                {item.href ? (
                  item.href.startsWith("/") ? (
                    <Link
                      href={item.href}
                      className="block truncate text-sm font-medium text-text-primary hover:text-accent hover:underline"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-text-primary hover:text-accent hover:underline"
                    >
                      {item.name}
                    </a>
                  )
                ) : (
                  <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                )}
                {showArtist && item.artistName && (
                  item.artistHref ? (
                    <Link
                      href={item.artistHref}
                      className="block truncate text-xs text-text-tertiary hover:text-accent hover:underline"
                    >
                      {item.artistName}
                    </Link>
                  ) : (
                    <p className="truncate text-xs text-text-tertiary">{item.artistName}</p>
                  )
                )}
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-text-secondary">
                <div className="font-medium text-text-primary">{formatDuration(item.msPlayed)}</div>
                <div className="text-text-tertiary">{item.plays} plays</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
