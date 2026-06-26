import { prisma } from "@/lib/db";
import type { PlatformId } from "@/lib/types";

const REVENUE_STATUSES = ["paid", "fulfilled"];

export interface PlatformSummary {
  platform: PlatformId;
  orders: number;
  revenue: number;
  units: number;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  avgOrderValue: number;
  byPlatform: PlatformSummary[];
  lowStockCount: number;
}

// Aggregate revenue/orders across all platforms for an optional date window.
export async function getDashboardSummary(
  since?: Date,
): Promise<DashboardSummary> {
  const where = {
    status: { in: REVENUE_STATUSES },
    ...(since ? { placedAt: { gte: since } } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
  });

  const byPlatformMap = new Map<PlatformId, PlatformSummary>();
  let totalRevenue = 0;
  let totalUnits = 0;

  for (const o of orders) {
    totalRevenue += o.total;
    const units = o.items.reduce((s, i) => s + i.quantity, 0);
    totalUnits += units;
    const key = o.platform as PlatformId;
    const cur =
      byPlatformMap.get(key) ?? { platform: key, orders: 0, revenue: 0, units: 0 };
    cur.orders += 1;
    cur.revenue += o.total;
    cur.units += units;
    byPlatformMap.set(key, cur);
  }

  // SQLite can't compare two columns directly, so scan once in memory.
  const invItems = await prisma.inventoryItem.findMany({
    select: { available: true, lowStockAt: true },
  });
  const lowStockCount = invItems.filter((i) => i.available <= i.lowStockAt).length;

  return {
    totalRevenue,
    totalOrders: orders.length,
    totalUnits,
    avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
    byPlatform: [...byPlatformMap.values()],
    lowStockCount,
  };
}

// Daily revenue series, split by platform, for the chart on the dashboard.
export interface DayPoint {
  date: string;
  shopify: number;
  shopee: number;
  lazada: number;
}

export async function getRevenueSeries(days = 30): Promise<DayPoint[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const orders = await prisma.order.findMany({
    where: { status: { in: REVENUE_STATUSES }, placedAt: { gte: since } },
    select: { platform: true, total: true, placedAt: true },
  });

  const byDay = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, shopify: 0, shopee: 0, lazada: 0 });
  }

  for (const o of orders) {
    const key = o.placedAt.toISOString().slice(0, 10);
    const point = byDay.get(key);
    if (!point) continue;
    point[o.platform as PlatformId] += o.total;
  }

  return [...byDay.values()];
}

// Best-selling products across all platforms.
export async function getTopProducts(limit = 10) {
  const items = await prisma.orderItem.findMany({
    where: { order: { status: { in: REVENUE_STATUSES } } },
    include: { order: { select: { platform: true } } },
  });

  const map = new Map<
    string,
    { sku: string; title: string; units: number; revenue: number }
  >();
  for (const it of items) {
    const key = it.sku ?? it.title;
    const cur = map.get(key) ?? { sku: key, title: it.title, units: 0, revenue: 0 };
    cur.units += it.quantity;
    cur.revenue += it.total;
    map.set(key, cur);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
