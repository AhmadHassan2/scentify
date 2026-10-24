# Fragrance data providers

Scentify ships with a synthetic dataset. Real datasets plug in through a **provider abstraction**, so the engine and UI never change.

```ts
interface FragranceDataProvider {
  readonly metadata: ProviderMetadata;   // id, licence, attribution, rate limit…
  getFragrances(): Promise<Fragrance[]>;
  getFragranceById(id: string): Promise<Fragrance | null>;
  getUpdatedFragrances(since: Date): Promise<Fragrance[]>;
}

interface RetailOfferProvider {          // prices & stock are a separate concern
  readonly metadata: ProviderMetadata;
  getOffers(queries: RetailOfferQuery[]): Promise<RetailerOffer[]>;
}
```

| File | Role |
| --- | --- |
| `src/lib/providers/types.ts` | Interfaces and errors |
| `src/lib/providers/synthetic/` | Working `SyntheticFragranceProvider` and generator |
| `src/lib/providers/adapters/external-catalog.ts` | Base class: credentials, rate limiting, retries, paging, note normalization, enrichment |
| `src/lib/providers/adapters/index.ts` | Documented stubs: `FragDBAdapter`, `ParfumDBAdapter`, `OpenBeautyFactsAdapter`, `AuthorizedRetailAdapter` |
| `src/lib/providers/normalize.ts` | Zod validation, note aliases, concentration aliases, dedupe keys |
| `src/lib/providers/sync.ts` | fetch → validate → dedupe → batch upsert → `sync_history` |
| `src/lib/database/supabase/catalog-sink.ts` | Idempotent upserts into Supabase |
| `scripts/sync-fragrances.ts` | CLI entry point for manual or scheduled runs |

## Candidate sources (research before you integrate)

Coverage, fields, licences and update schedules differ. **Don't assume parity.**

| Source | Likely use | Things to verify |
| --- | --- | --- |
| **FragDB** | Structured fragrance records (notes, accords, perfumers) | Commercial licence terms, attribution format, rate limits, field schema, update cadence |
| **ParfumDB** | Alternative or complementary structured catalog | Same as above. Overlap with FragDB (use dedupe keys) |
| **Open Beauty Facts** | Supplementary product info: barcodes (GTIN), packaging, images | **ODbL share-alike** obligations for derived databases; images are CC BY-SA; notes are rarely present |
| **Squirrel API / affiliate networks / retailer APIs** | Retail prices, sizes, discounts, stock, purchase links | Authorized access only, display rules, caching limits, required disclosures, affiliate terms |
| **Official brand or retailer feeds** | Authoritative metadata and imagery | Written permission and usage scope |

**Do not scrape websites without authorization.** Use only APIs, feeds or datasets you have explicit rights to.

## Implementing an adapter

1. **Licence first.** Record the licence, attribution and whether commercial display is allowed in `metadata`. Keep `commercialUseVerified: false` until legal sign-off. The sync CLI warns when it's false.
2. **Credentials.** Add the variables to `.env.example` and list them in `requiredEnv`. The base class throws `ProviderNotConfiguredError` if any are missing, so nothing calls out by accident.
3. **Map the payload.** Implement `toRaw(payload) → RawExternalFragrance`. Use the provider's stable id as `externalId`. Our UUID is derived from `providerId:externalId`, so it survives re-syncs.
4. **Fetch.** Implement `fetchPage(cursor, since)` and `fetchOne(id)`. The base class applies the token-bucket `RateLimiter` (`metadata.rateLimitPerMinute`) and retries retryable failures with backoff. Throw `ProviderRequestError(message, status, retryable)` from your HTTP layer.
5. **Normalization is automatic.** Notes go through the alias index, and unknown notes are counted in `adapter.unknownNotes` so you can extend the taxonomy. Concentration is normalized. Missing attributes, seasons, occasions and accords are derived with `enrichFromNotes`, and provider-supplied performance numbers take precedence when present.
6. **Register it** in `src/lib/providers/registry.ts`.
7. **Test with recorded fixtures.** Add contract tests like `tests/providers.test.ts`, using saved sample payloads and never live calls.
8. **Dry-run:** `npm run sync -- --provider <id> --dry-run`.

### Metadata vs retail offers

Fragrance metadata (`fragrances`, `fragrance_notes`, `fragrance_attributes`) is separate from bottle sizes (`fragrance_variants`) and retailer prices (`retailer_offers`, keyed by variant, source and retailer SKU). A metadata-only provider can create records without variants. Those are stored, but the catalog repository hides them from recommendations until a retail source attaches at least one variant. `entryPrice()` already prefers in-stock offers over list prices, so retailer data flows into budgets and scoring with no engine change.

## Scheduled synchronization

| Job | Suggested cadence | Command |
| --- | --- | --- |
| Catalog refresh (incremental) | Weekly | `npm run sync -- --provider fragdb --mode incremental` |
| New fragrance imports | Weekly, alongside the refresh | (same, incremental picks up new records) |
| Retail price refresh | Daily | Retail job calling `RetailOfferProvider.getOffers` for active variants, upserting `retailer_offers` |
| Stock refresh | Daily (or more often for popular SKUs) | Same job, `kind: "stock"` |
| Full rebuild + related links | Monthly | `--mode full`, then `sink.replaceRelated()` |

Scheduler options, any of which works because the CLI is self-contained:

- **GitHub Actions** with a `schedule:` cron, storing secrets in repository secrets.
- **Supabase scheduled functions** (pg_cron + Edge Function) calling a protected route that wraps `syncCatalog`.
- **Vercel Cron** hitting a route protected by a `CRON_SECRET` header.

Incremental runs read the last successful `sync_history` row for the source and request only records changed since then. If more than 20% of fetched records fail validation, the run **aborts without writing** (`maxInvalidRatio`) to protect existing data. Every run is recorded in `sync_history` with counts, issues and errors.

## Provenance

Every record keeps `source_id`, `source_record_id`, `source_url`, `attribution`, `license` and `source_updated_at`. `data_sources` describes each provider. Show the attribution wherever the licence requires it; the detail page already renders `source.attribution`.
