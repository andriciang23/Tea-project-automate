"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Inline editor for a SKU's master stock. On save it sets the master figure
// and pushes it to every configured platform.
export function StockEditor({
  sku,
  initial,
}: {
  sku: string;
  initial: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = value !== initial;

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "set-stock", sku, available: value }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-sm"
      />
      <button
        onClick={save}
        disabled={!dirty || busy}
        className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-30"
      >
        {busy ? "…" : "Set & push"}
      </button>
    </div>
  );
}
