/**
 * Regenerates the synthetic demonstration catalog.
 *
 *   npm run data:generate
 *
 * Writes:
 *   src/lib/providers/synthetic/synthetic-fragrances.json  (used by the app in local mode)
 *   supabase/seed/seed.sql                                  (optional SQL seed for Supabase)
 *
 * Output is deterministic for a given seed, so ids are stable across runs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generateSyntheticCatalog } from "../src/lib/providers/synthetic/generator";
import { buildSeedSql } from "../src/lib/providers/synthetic/seed-sql";

const root = resolve(import.meta.dirname, "..");
const catalog = generateSyntheticCatalog();

const jsonPath = resolve(root, "src/lib/providers/synthetic/synthetic-fragrances.json");
writeFileSync(jsonPath, JSON.stringify(catalog, null, 1) + "\n");

const sqlPath = resolve(root, "supabase/seed/seed.sql");
mkdirSync(dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, buildSeedSql(catalog));

const byFamily = new Map<string, number>();
for (const f of catalog) byFamily.set(f.families[0], (byFamily.get(f.families[0]) ?? 0) + 1);
console.log(`Generated ${catalog.length} synthetic fragrances`);
console.log(Object.fromEntries([...byFamily.entries()].sort((a, b) => b[1] - a[1])));
console.log(`→ ${jsonPath}\n→ ${sqlPath}`);
