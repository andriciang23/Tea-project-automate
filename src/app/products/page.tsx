import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge } from "@/components/PlatformBadge";
import { SyncButton } from "@/components/SyncButton";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: { listings: true, inventory: true },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Unified catalog — each item with its listing on every platform"
        actions={<SyncButton scope="products" label="Sync listings" />}
      />

      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.length === 0 && (
            <p className="text-sm text-slate-400">
              No products yet. Click “Sync listings” or seed demo data.
            </p>
          )}
          {products.map((p) => {
            const listed = new Set(p.listings.map((l) => l.platform));
            const allPlatforms: PlatformId[] = ["shopify", "shopee", "lazada"];
            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{p.title}</div>
                    <div className="text-xs text-slate-400">SKU {p.sku}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {p.inventory?.available ?? 0} in stock
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {p.listings.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <PlatformBadge platform={l.platform as PlatformId} />
                      <span className="text-slate-700">
                        {money(l.price, l.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Surface platforms where this SKU is NOT yet listed — the
                    listing-sync gap the merchant should close. */}
                {allPlatforms.some((pl) => !listed.has(pl)) && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <span>Not listed on:</span>
                    {allPlatforms
                      .filter((pl) => !listed.has(pl))
                      .map((pl) => (
                        <PlatformBadge key={pl} platform={pl} />
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
