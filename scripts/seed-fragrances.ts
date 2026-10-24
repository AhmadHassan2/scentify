/**
 * Seed Supabase with the synthetic demonstration catalog.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local).
 * Idempotent: safe to run repeatedly. Runs through the same provider → validate
 * → dedupe → upsert pipeline that real data providers will use.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createSupabaseAdminClient } from "../src/lib/database/supabase/admin";
import { SupabaseCatalogSink } from "../src/lib/database/supabase/catalog-sink";
import { syncCatalog } from "../src/lib/providers/sync";
import { SyntheticFragranceProvider } from "../src/lib/providers/synthetic/synthetic-provider";

async function main() {
  const provider = new SyntheticFragranceProvider();
  const sink = new SupabaseCatalogSink(createSupabaseAdminClient());
  console.log(`Seeding from "${provider.metadata.name}"…`);
  const summary = await syncCatalog(provider, sink, { mode: "full" });
  if (summary.status === "failed") throw new Error(summary.error ?? "Seed failed");
  await sink.replaceRelated(await provider.getFragrances(), "synthetic");
  console.log(
    `Done: ${summary.upserted} upserted, ${summary.skipped} skipped, ${summary.duplicates} duplicates (status: ${summary.status}).`,
  );
  for (const issue of summary.issues.slice(0, 10)) console.warn(`  ! ${issue.providerRecordId}: ${issue.message}`);
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
