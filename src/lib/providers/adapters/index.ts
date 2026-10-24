import type { RetailerOffer } from "@/types/fragrance";
import {
  ExternalCatalogAdapter,
  type PagedResult,
  type RawExternalFragrance,
} from "./external-catalog";
import {
  ProviderNotConfiguredError,
  type ProviderMetadata,
  type RetailOfferProvider,
  type RetailOfferQuery,
} from "../types";

/**
 * FUTURE ADAPTERS — intentionally not calling any external API yet.
 *
 * Each adapter documents what is known/assumed about its provider. Before
 * enabling one in production you must (see docs/DATA_PROVIDERS.md):
 *   1. Obtain credentials and a written licence covering your use case.
 *   2. Confirm the real response schema and update `toRaw`.
 *   3. Confirm rate limits and set `rateLimitPerMinute`.
 *   4. Implement `fetchPage` / `fetchOne` and add contract tests with recorded fixtures.
 */

class NotImplementedYet extends Error {
  constructor(provider: string) {
    super(
      `${provider} adapter is a documented stub. Implement fetchPage/fetchOne after confirming the API contract and licence.`,
    );
  }
}

/** FragDB — structured fragrance records (notes, accords, perfumers). */
export class FragDBAdapter extends ExternalCatalogAdapter<Record<string, unknown>> {
  readonly metadata: ProviderMetadata = {
    id: "fragdb",
    name: "FragDB",
    kind: "catalog",
    license: "Commercial licence required — verify terms",
    attribution: "Fragrance data © FragDB",
    homepage: null,
    commercialUseVerified: false,
    rateLimitPerMinute: 60,
  };
  protected readonly requiredEnv = ["FRAGDB_API_KEY", "FRAGDB_BASE_URL"];

  protected async fetchPage(): Promise<PagedResult<Record<string, unknown>>> {
    throw new NotImplementedYet("FragDB");
  }
  protected async fetchOne(): Promise<Record<string, unknown> | null> {
    throw new NotImplementedYet("FragDB");
  }
  protected toRaw(p: Record<string, unknown>): RawExternalFragrance {
    // Assumed shape — replace with the confirmed schema.
    const notes = (p.notes ?? {}) as Record<string, string[]>;
    return {
      externalId: String(p.id),
      brand: String(p.brand ?? ""),
      name: String(p.name ?? ""),
      concentration: (p.concentration as string) ?? null,
      gender: (p.gender as string) ?? null,
      releaseYear: (p.year as number) ?? null,
      description: (p.description as string) ?? null,
      topNotes: notes.top ?? [],
      middleNotes: notes.middle ?? notes.heart ?? [],
      baseNotes: notes.base ?? [],
      updatedAt: String(p.updated_at ?? new Date().toISOString()),
    };
  }
}

/** ParfumDB — alternative structured catalog. */
export class ParfumDBAdapter extends ExternalCatalogAdapter<Record<string, unknown>> {
  readonly metadata: ProviderMetadata = {
    id: "parfumdb",
    name: "ParfumDB",
    kind: "catalog",
    license: "Verify licence and attribution requirements",
    attribution: "Fragrance data © ParfumDB",
    homepage: null,
    commercialUseVerified: false,
    rateLimitPerMinute: 30,
  };
  protected readonly requiredEnv = ["PARFUMDB_API_KEY", "PARFUMDB_BASE_URL"];

  protected async fetchPage(): Promise<PagedResult<Record<string, unknown>>> {
    throw new NotImplementedYet("ParfumDB");
  }
  protected async fetchOne(): Promise<Record<string, unknown> | null> {
    throw new NotImplementedYet("ParfumDB");
  }
  protected toRaw(p: Record<string, unknown>): RawExternalFragrance {
    const pyramid = (p.pyramid ?? {}) as Record<string, string[]>;
    return {
      externalId: String(p.id),
      brand: String(p.house ?? ""),
      name: String(p.title ?? ""),
      concentration: (p.type as string) ?? null,
      releaseYear: (p.launch_year as number) ?? null,
      topNotes: pyramid.top ?? [],
      middleNotes: pyramid.heart ?? [],
      baseNotes: pyramid.base ?? [],
      updatedAt: String(p.modified ?? new Date().toISOString()),
    };
  }
}

/**
 * Open Beauty Facts — open data (ODbL). Useful for supplementary product
 * info (barcodes, packaging, images) rather than olfactive notes. ODbL has
 * share-alike obligations for derived databases — review before mixing.
 */
export class OpenBeautyFactsAdapter extends ExternalCatalogAdapter<Record<string, unknown>> {
  readonly metadata: ProviderMetadata = {
    id: "open-beauty-facts",
    name: "Open Beauty Facts",
    kind: "supplementary",
    license: "ODbL 1.0 (database), CC BY-SA (images) — share-alike obligations apply",
    attribution: "Data from Open Beauty Facts (openbeautyfacts.org), ODbL",
    homepage: "https://world.openbeautyfacts.org",
    commercialUseVerified: false,
    rateLimitPerMinute: 10,
  };
  protected readonly requiredEnv = ["OPEN_BEAUTY_FACTS_ENABLED"];

  protected async fetchPage(): Promise<PagedResult<Record<string, unknown>>> {
    throw new NotImplementedYet("Open Beauty Facts");
  }
  protected async fetchOne(): Promise<Record<string, unknown> | null> {
    throw new NotImplementedYet("Open Beauty Facts");
  }
  protected toRaw(p: Record<string, unknown>): RawExternalFragrance {
    return {
      externalId: String(p.code),
      brand: String(p.brands ?? ""),
      name: String(p.product_name ?? ""),
      topNotes: [],
      middleNotes: [],
      baseNotes: [],
      imageUrl: (p.image_url as string) ?? null,
      updatedAt: new Date(Number(p.last_modified_t ?? 0) * 1000).toISOString(),
    };
  }
}

/**
 * Authorized retail offers (e.g. Squirrel API, affiliate networks, retailer
 * feeds). Prices and stock live in `retailer_offers`, keyed to our variants.
 */
export class AuthorizedRetailAdapter implements RetailOfferProvider {
  readonly metadata: ProviderMetadata = {
    id: "retail-feed",
    name: "Authorized retail feed",
    kind: "retail",
    license: "Per-retailer/affiliate agreement",
    attribution: "Prices provided by participating retailers",
    homepage: null,
    commercialUseVerified: false,
    rateLimitPerMinute: 60,
  };

  async getOffers(queries: RetailOfferQuery[]): Promise<RetailerOffer[]> {
    if (!process.env.RETAIL_FEED_API_KEY) {
      throw new ProviderNotConfiguredError(this.metadata.id, ["RETAIL_FEED_API_KEY"]);
    }
    void queries;
    throw new NotImplementedYet("Retail feed");
  }
}
