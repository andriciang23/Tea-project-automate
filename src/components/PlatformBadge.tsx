import { PLATFORMS, type PlatformId } from "@/lib/types";

const meta: Record<PlatformId, { label: string; bg: string; fg: string }> = {
  shopify: { label: "Shopify", bg: "#eaf3da", fg: "#5a7a23" },
  shopee: { label: "Shopee", bg: "#fde6e0", fg: "#c63a1f" },
  lazada: { label: "Lazada", bg: "#e0e2f2", fg: "#0f146d" },
};

export function PlatformBadge({ platform }: { platform: PlatformId }) {
  const m = meta[platform] ?? {
    label: platform,
    bg: "#e2e8f0",
    fg: "#334155",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

export { PLATFORMS };
