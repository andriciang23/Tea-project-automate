import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge } from "@/components/PlatformBadge";
import { StockEditor } from "@/components/StockEditor";
import { SyncButton } from "@/components/SyncButton";
import { prisma } from "@/lib/db";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    include: {
      product: { include: { listings: true } },
      platformLevels: true,
    },
    orderBy: { available: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="One master stock figure, pushed to every store so you never oversell"
        actions={
          <div className="flex gap-3">
            <SyncButton scope="inventory-pull" label="Read levels" />
            <SyncButton scope="inventory-push" label="Push all stock" />
          </div>
        }
      />

      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Listed on</th>
                <th className="px-4 py-3">Per-platform stock</th>
                <th className="px-4 py-3 text-right">Master stock</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No products yet. Sync products or seed demo data.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const low = item.available <= item.lowStockAt;
                const levelByPlatform = new Map(
                  item.platformLevels.map((l) => [l.platform, l.quantity]),
                );
                const platforms = [
                  ...new Set(item.product.listings.map((l) => l.platform)),
                ] as PlatformId[];
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 ${low ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        {low && <span title="Low stock">⚠️</span>}
                        {item.product.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {platforms.length ? (
                          platforms.map((p) => <PlatformBadge key={p} platform={p} />)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {platforms.length ? (
                        <div className="flex gap-3">
                          {platforms.map((p) => (
                            <span key={p}>
                              {p}: {levelByPlatform.get(p) ?? "?"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StockEditor sku={item.sku} initial={item.available} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          ⚠️ marks SKUs at or below their low-stock threshold. Editing master
          stock pushes the new figure to every connected platform immediately.
        </p>
      </div>
    </>
  );
}
