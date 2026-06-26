import { PageHeader } from "@/components/PageHeader";
import { allAdapters } from "@/lib/platforms/registry";
import { prisma } from "@/lib/db";
import { PlatformBadge } from "@/components/PlatformBadge";
import { shortDate } from "@/lib/format";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

const REQUIRED_ENV: Record<PlatformId, string[]> = {
  shopify: ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN"],
  shopee: [
    "SHOPEE_PARTNER_ID",
    "SHOPEE_PARTNER_KEY",
    "SHOPEE_SHOP_ID",
    "SHOPEE_ACCESS_TOKEN",
  ],
  lazada: ["LAZADA_APP_KEY", "LAZADA_APP_SECRET", "LAZADA_ACCESS_TOKEN"],
};

export default async function SettingsPage() {
  const adapters = allAdapters();
  const recentLogs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 12,
  });

  return (
    <>
      <PageHeader
        title="Settings & Connections"
        subtitle="Connect each store by adding its credentials to .env"
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {adapters.map((a) => {
            const configured = a.isConfigured();
            return (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <PlatformBadge platform={a.id} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      configured
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {configured ? "Connected" : "Not connected"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Required environment variables:
                </p>
                <ul className="mt-2 space-y-1">
                  {REQUIRED_ENV[a.id].map((env) => (
                    <li
                      key={env}
                      className="flex items-center gap-2 font-mono text-xs text-slate-600"
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          process.env[env] ? "bg-green-500" : "bg-slate-300"
                        }`}
                      />
                      {env}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Recent sync activity
          </h2>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400">No syncs run yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">When</th>
                  <th className="pb-2">Platform</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Direction</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-500">{shortDate(l.startedAt)}</td>
                    <td className="py-2">
                      <PlatformBadge platform={l.platform as PlatformId} />
                    </td>
                    <td className="py-2 text-slate-600">{l.type}</td>
                    <td className="py-2 text-slate-500">{l.direction}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.status === "success"
                            ? "bg-green-100 text-green-700"
                            : l.status === "partial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400">{l.message ?? "—"}</td>
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
