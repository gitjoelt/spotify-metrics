"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ImportResult {
  ok: boolean;
  error?: string;
  totalParsed?: number;
  totalInserted?: number;
  totalSkipped?: number;
  files?: { name: string; parsed: number; error?: string }[];
}

export default function ImportPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (data.ok) router.refresh();
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Import Spotify History
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Spotify&apos;s live API only exposes your last ~50 plays. For full historical stats,
          request your <strong className="text-text-primary">Extended Streaming History</strong>{" "}
          from Spotify:
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-text-secondary">
          <li>
            Go to{" "}
            <a
              href="https://www.spotify.com/account/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:text-accent-hover"
            >
              spotify.com/account/privacy
            </a>
          </li>
          <li>Request &quot;Extended streaming history&quot;</li>
          <li>
            Wait for Spotify&apos;s email (can take up to a few days) and download the ZIP
          </li>
          <li>
            Unzip it and select the{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-primary">
              .json
            </code>{" "}
            files named like{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-primary">
              Streaming_History_Audio_*.json
            </code>{" "}
            below
          </li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="file"
          accept=".json"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="rounded-lg border border-border-strong bg-surface p-3 text-sm text-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent-ink"
        />
        <button
          type="submit"
          disabled={!files || files.length === 0 || uploading}
          className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {uploading ? "Importing…" : "Import"}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-xl border p-4 text-sm leading-relaxed ${
            result.ok
              ? "border-accent/25 bg-surface text-text-secondary"
              : "border-danger/25 bg-danger-bg text-danger"
          }`}
        >
          {result.ok ? (
            <>
              <p>
                Parsed <span className="font-semibold text-text-primary">{result.totalParsed}</span>{" "}
                plays across {result.files?.length} file(s). Added{" "}
                <span className="font-semibold text-accent">{result.totalInserted}</span> new,
                skipped {result.totalSkipped} (already imported).
              </p>
              {result.files?.some((f) => f.error) && (
                <ul className="mt-2 list-disc pl-5">
                  {result.files
                    .filter((f) => f.error)
                    .map((f) => (
                      <li key={f.name}>
                        {f.name}: {f.error}
                      </li>
                    ))}
                </ul>
              )}
            </>
          ) : (
            <p>Import failed: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
