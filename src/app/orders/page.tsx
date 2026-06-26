import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge } from "@/components/PlatformBadge";
import { SyncButton } from "@/components/SyncButton";
import { prisma } from "@/lib/db";
import { money, shortDate, statusColor } from "@/lib/format";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { platform?: string; status?: string };
}) {
  const where: Record<string, unknown> = {};
  if (searchParams.platform) where.platform = searchParams.platform;
  if (searchParams.status) where.status = searchParams.status;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    take: 100,
    include: { items: true },
  });

  const filters = [
    { key: "platform", value: "shopify", label: "Shopify" },
    { key: "platform", value: "shopee", label: "Shopee" },
    { key: "platform", value: "lazada", label: "Lazada" },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order from all 3 stores, in one inbox"
        actions={<SyncButton scope="orders" label="Pull orders" />}
      />

      <div className="p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href="/orders"
            className={`rounded-full border px-3 py-1 text-sm ${
              !searchParams.platform
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-600"
            }`}
          >
            All
          </a>
          {filters.map((f) => (
            <a
              key={f.value}
              href={`/orders?platform=${f.value}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                searchParams.platform === f.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No orders yet. Click “Pull orders” or seed demo data.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {o.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={o.platform as PlatformId} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.customerName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                        o.status,
                      )}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {shortDate(o.placedAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {money(o.total, o.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
