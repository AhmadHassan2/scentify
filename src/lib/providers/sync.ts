import type { Fragrance } from "@/types/fragrance";
import { dedupe, validateFragrance, type ValidationIssue } from "./normalize";
import type { FragranceDataProvider } from "./types";

/**
 * Provider-agnostic catalog synchronization:
 *   fetch (full or incremental) → validate → dedupe → batch upsert → record history
 *
 * The sink decides where data lands (Supabase, a dry-run log, a test double).
 */

export type SyncKind = "catalog" | "prices" | "stock";

export interface SyncSummary {
  sourceId: string;
  kind: SyncKind;
  mode: "full" | "incremental";
  startedAt: string;
  finishedAt: string;
  status: "succeeded" | "partial" | "failed";
  fetched: number;
  upserted: number;
  skipped: number;
  duplicates: number;
  issues: ValidationIssue[];
  error: string | null;
}

export interface CatalogSink {
  getLastSuccessfulSync(sourceId: string, kind: SyncKind): Promise<Date | null>;
  ensureSource(provider: FragranceDataProvider): Promise<void>;
  upsertFragrances(batch: Fragrance[]): Promise<number>;
  recordSync(summary: SyncSummary): Promise<void>;
}

export interface SyncOptions {
  mode?: "full" | "incremental";
  batchSize?: number;
  /** Fail the whole run when more than this share of records is invalid. */
  maxInvalidRatio?: number;
}

export async function syncCatalog(
  provider: FragranceDataProvider,
  sink: CatalogSink,
  options: SyncOptions = {},
): Promise<SyncSummary> {
  const { batchSize = 50, maxInvalidRatio = 0.2 } = options;
  const startedAt = new Date().toISOString();
  const sourceId = provider.metadata.id;
  const summary: SyncSummary = {
    sourceId, kind: "catalog", mode: options.mode ?? "incremental", startedAt, finishedAt: startedAt,
    status: "succeeded", fetched: 0, upserted: 0, skipped: 0, duplicates: 0, issues: [], error: null,
  };

  try {
    await sink.ensureSource(provider);
    const since = summary.mode === "incremental" ? await sink.getLastSuccessfulSync(sourceId, "catalog") : null;
    if (!since) summary.mode = "full";
    const records = since ? await provider.getUpdatedFragrances(since) : await provider.getFragrances();
    summary.fetched = records.length;

    const valid: Fragrance[] = [];
    for (const record of records) {
      const result = validateFragrance(record);
      if (result.ok) valid.push(result.value);
      else summary.issues.push({ providerRecordId: record?.source?.providerRecordId ?? "unknown", message: result.message });
    }
    summary.skipped = summary.issues.length;
    if (records.length && summary.skipped / records.length > maxInvalidRatio) {
      throw new Error(`${summary.skipped}/${records.length} records failed validation — aborting to protect existing data`);
    }

    const { unique, duplicates } = dedupe(valid);
    summary.duplicates = duplicates;
    for (let i = 0; i < unique.length; i += batchSize) {
      summary.upserted += await sink.upsertFragrances(unique.slice(i, i + batchSize));
    }
    summary.status = summary.skipped ? "partial" : "succeeded";
  } catch (error) {
    summary.status = "failed";
    summary.error = error instanceof Error ? error.message : String(error);
  }

  summary.finishedAt = new Date().toISOString();
  await sink.recordSync(summary).catch(() => undefined);
  return summary;
}

/** Sink that validates the pipeline without writing anywhere. */
export class DryRunSink implements CatalogSink {
  readonly upserted: Fragrance[] = [];
  async getLastSuccessfulSync(): Promise<Date | null> {
    return null;
  }
  async ensureSource(): Promise<void> {}
  async upsertFragrances(batch: Fragrance[]): Promise<number> {
    this.upserted.push(...batch);
    return batch.length;
  }
  async recordSync(): Promise<void> {}
}
