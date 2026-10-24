/**
 * Synchronize a fragrance data provider into the database.
 *
 *   npm run sync -- --provider synthetic --dry-run
 *   npm run sync -- --provider fragdb --mode incremental
 *
 * Options:
 *   --provider <id>   synthetic | fragdb | parfumdb | open-beauty-facts  (default: synthetic)
 *   --mode <m>        full | incremental (default: incremental — falls back to full on first run)
 *   --dry-run         validate & normalize only; write nothing
 *
 * Designed to run on a schedule (cron, GitHub Actions, Supabase scheduled
 * functions). See docs/DATA_PROVIDERS.md for recommended cadences.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createSupabaseAdminClient } from "../src/lib/database/supabase/admin";
import { SupabaseCatalogSink } from "../src/lib/database/supabase/catalog-sink";
import { getProvider, PROVIDER_IDS } from "../src/lib/providers/registry";
import { DryRunSink, syncCatalog, type CatalogSink } from "../src/lib/providers/sync";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const providerId = arg("provider") ?? "synthetic";
  const mode = (arg("mode") ?? "incremental") as "full" | "incremental";
  const dryRun = process.argv.includes("--dry-run");
  if (!PROVIDER_IDS.includes(providerId)) throw new Error(`Unknown provider. Choose one of: ${PROVIDER_IDS.join(", ")}`);

  const provider = getProvider(providerId);
  if (!provider.metadata.commercialUseVerified) {
    console.warn(`⚠ "${provider.metadata.name}" licence not yet verified for commercial use: ${provider.metadata.license}`);
  }
  const sink: CatalogSink = dryRun ? new DryRunSink() : new SupabaseCatalogSink(createSupabaseAdminClient());

  console.log(`Syncing ${provider.metadata.name} (${mode}${dryRun ? ", dry run" : ""})…`);
  const summary = await syncCatalog(provider, sink, { mode });
  console.log(JSON.stringify({ ...summary, issues: summary.issues.slice(0, 5), totalIssues: summary.issues.length }, null, 2));
  if (summary.status === "failed") process.exit(1);
}

main().catch((error) => {
  console.error("Sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
