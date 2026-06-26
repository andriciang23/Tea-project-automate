"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Triggers a sync via the API then refreshes server components.
export function SyncButton({
  scope = "all",
  label = "Sync now",
  body,
}: {
  scope?: string;
  label?: string;
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const results = data.results ?? [];
      const errors = results.filter((r: { status: string }) => r.status === "error");
      setMsg(
        errors.length
          ? `Done with ${errors.length} error(s)`
          : "Synced ✓",
      );
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Syncing…" : label}
      </button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}
