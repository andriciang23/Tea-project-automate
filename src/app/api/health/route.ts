import { NextResponse } from "next/server";
import { allAdapters } from "@/lib/platforms/registry";

export const dynamic = "force-dynamic";

// Connection-health panel data: per-platform configured + reachable status.
export async function GET() {
  const adapters = allAdapters();
  const health = await Promise.all(
    adapters.map(async (a) => {
      const configured = a.isConfigured();
      const check = configured
        ? await a.healthCheck().catch((e) => ({ ok: false, message: (e as Error).message }))
        : { ok: false, message: "Not configured — add credentials in .env" };
      return { platform: a.id, label: a.label, configured, ...check };
    }),
  );
  return NextResponse.json({ health });
}
