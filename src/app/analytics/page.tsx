import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge } from "@/components/PlatformBadge";
import { RevenueChart } from "@/components/RevenueChart";
import { StatCard } from "@/components/StatCard";
import {
  getDashboardSummary,
  getRevenueSeries,
  getTopProducts,
} from "@/lib/analytics";
import { money } from "@/lib/format";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [summary, series, top] = await Promise.all([
    getDashboardSummary(),
    getRevenueSeries(30),
    getTopProducts(15),
  ]);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Cross-platform sales performance"
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Revenue (30d)" value={money(summary.totalRevenue)} />
          <StatCard label="Orders" value={String(summary.totalOrders)} />
          <StatCard label="Units sold" value={String(summary.totalUnits)} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Stacked revenue by platform
          </h2>
          <RevenueChart data={series} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Platform comparison
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Platform</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">AOV</th>
                </tr>
              </thead>
              <tbody>
                {summary.byPlatform.map((p) => (
                  <tr key={p.platform} className="border-t border-slate-100">
                    <td className="py-2">
                      <PlatformBadge platform={p.platform as PlatformId} />
                    </td>
                    <td className="py-2 text-right">{p.orders}</td>
                    <td className="py-2 text-right">{p.units}</td>
                    <td className="py-2 text-right font-medium">
                      {money(p.revenue)}
                    </td>
                    <td className="py-2 text-right text-slate-500">
                      {money(p.orders ? p.revenue / p.orders : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Best sellers
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p) => (
                  <tr key={p.sku} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">{p.title}</td>
                    <td className="py-2 text-right">{p.units}</td>
                    <td className="py-2 text-right font-medium">
                      {money(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
