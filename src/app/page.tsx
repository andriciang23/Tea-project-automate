import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge } from "@/components/PlatformBadge";
import { RevenueChart } from "@/components/RevenueChart";
import { StatCard } from "@/components/StatCard";
import { SyncButton } from "@/components/SyncButton";
import {
  getDashboardSummary,
  getRevenueSeries,
  getTopProducts,
} from "@/lib/analytics";
import { money } from "@/lib/format";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [summary, series, top] = await Promise.all([
    getDashboardSummary(),
    getRevenueSeries(30),
    getTopProducts(5),
  ]);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Combined performance across Shopify, Shopee, and Lazada"
        actions={<SyncButton scope="all" label="Sync all stores" />}
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total revenue (paid)"
            value={money(summary.totalRevenue)}
            sub={`${summary.totalOrders} orders`}
          />
          <StatCard
            label="Avg order value"
            value={money(summary.avgOrderValue)}
            sub={`${summary.totalUnits} units sold`}
          />
          <StatCard
            label="Orders"
            value={String(summary.totalOrders)}
            sub="across all platforms"
          />
          <StatCard
            label="Low-stock SKUs"
            value={String(summary.lowStockCount)}
            sub="need restocking"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Revenue — last 30 days
            </h2>
            <RevenueChart data={series} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Revenue by platform
            </h2>
            <div className="space-y-4">
              {summary.byPlatform.length === 0 && (
                <p className="text-sm text-slate-400">
                  No sales yet. Run a sync or seed demo data.
                </p>
              )}
              {summary.byPlatform
                .sort((a, b) => b.revenue - a.revenue)
                .map((p) => {
                  const pct = summary.totalRevenue
                    ? (p.revenue / summary.totalRevenue) * 100
                    : 0;
                  return (
                    <div key={p.platform}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <PlatformBadge platform={p.platform as PlatformId} />
                        <span className="font-medium text-slate-700">
                          {money(p.revenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-slate-800"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {p.orders} orders · {pct.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Top products
          </h2>
          {top.length === 0 ? (
            <p className="text-sm text-slate-400">No sales data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p) => (
                  <tr key={p.sku} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">{p.title}</td>
                    <td className="py-2 text-slate-400">{p.sku}</td>
                    <td className="py-2 text-right text-slate-700">{p.units}</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {money(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
