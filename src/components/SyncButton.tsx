"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

export default function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const ranInitialSync = useRef(false);

  async function sync() {
    setSyncing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(`Sync failed: ${data.error ?? res.statusText}`);
      } else {
        setStatus(
          data.inserted > 0
            ? `Added ${data.inserted} new play${data.inserted === 1 ? "" : "s"}`
            : "Up to date",
        );
        router.refresh();
      }
    } catch {
      setStatus("Sync failed: network error");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (ranInitialSync.current) return;
    ranInitialSync.current = true;
    sync();

    const interval = setInterval(sync, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={sync}
        disabled={syncing}
        className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {status && <span className="text-text-tertiary">{status}</span>}
    </div>
  );
}
