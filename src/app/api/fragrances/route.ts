import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/database/catalog";
import { toSummary } from "@/lib/fragrance/utils";
import { handleApiError } from "@/lib/api";

/** Lightweight catalog listing (summaries) for pickers and client-side filtering. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
    const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
    let list = await getCatalog();
    if (ids?.length) list = list.filter((f) => ids.includes(f.id));
    if (q) list = list.filter((f) => `${f.name} ${f.brand}`.toLowerCase().includes(q));
    return NextResponse.json({ fragrances: list.slice(0, 200).map(toSummary) });
  } catch (error) {
    return handleApiError(error);
  }
}
