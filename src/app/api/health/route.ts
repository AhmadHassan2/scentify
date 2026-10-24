import { NextResponse } from "next/server";
import { publicConfig } from "@/lib/config";
import { getCatalog } from "@/lib/database/catalog";
import { ENGINE_VERSION } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json({ ok: true, engineVersion: ENGINE_VERSION, catalogSize: catalog.length, ...publicConfig() });
}
