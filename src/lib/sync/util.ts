import { prisma } from "@/lib/db";
import type { PlatformId, SyncResult } from "@/lib/types";

// Wrap a sync operation so every run is timed and recorded in SyncLog.
export async function withSyncLog(
  platform: PlatformId,
  type: "orders" | "inventory" | "products",
  direction: "pull" | "push",
  fn: () => Promise<{ recordCount: number; message?: string }>,
): Promise<SyncResult> {
  const log = await prisma.syncLog.create({
    data: { platform, type, direction, status: "success" },
  });
  try {
    const { recordCount, message } = await fn();
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        recordCount,
        message,
        finishedAt: new Date(),
      },
    });
    return { platform, type, direction, status: "success", recordCount, message };
  } catch (e) {
    const message = (e as Error).message;
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "error", message, finishedAt: new Date() },
    });
    return { platform, type, direction, status: "error", recordCount: 0, message };
  }
}

// Ensure a Product row exists for a given SKU; used when ingesting orders or
// listings that reference SKUs we haven't catalogued yet.
export async function ensureProduct(
  sku: string,
  title: string,
  imageUrl?: string,
): Promise<string> {
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) return existing.id;
  const created = await prisma.product.create({
    data: {
      sku,
      title,
      imageUrl,
      inventory: { create: { sku, available: 0 } },
    },
  });
  return created.id;
}
