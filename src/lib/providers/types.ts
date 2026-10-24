import type { Fragrance, RetailerOffer } from "@/types/fragrance";

/**
 * Provider abstraction. The recommendation engine and the UI only ever see
 * normalized `Fragrance` records, so swapping synthetic data for a licensed
 * dataset means writing an adapter — not touching scoring or pages.
 */

export interface ProviderMetadata {
  id: string;
  name: string;
  kind: "catalog" | "retail" | "supplementary";
  /** Human-readable licence summary. Must be verified before production use. */
  license: string;
  attribution: string;
  homepage: string | null;
  /** Whether the licence permits commercial display of the data. */
  commercialUseVerified: boolean;
  /** Requests per minute the adapter will not exceed. */
  rateLimitPerMinute: number;
}

export interface FragranceDataProvider {
  readonly metadata: ProviderMetadata;
  /** Throws ProviderNotConfiguredError when credentials are missing. */
  getFragrances(): Promise<Fragrance[]>;
  getFragranceById(id: string): Promise<Fragrance | null>;
  /** Incremental sync: records created/changed since `since`. */
  getUpdatedFragrances(since: Date): Promise<Fragrance[]>;
}

export interface RetailOfferQuery {
  /** Our variant id plus the identifiers a retailer can match on. */
  variantId: string;
  brand: string;
  name: string;
  sizeMl: number;
  gtin?: string | null;
}

/** Retail prices/stock are a separate concern from fragrance metadata. */
export interface RetailOfferProvider {
  readonly metadata: ProviderMetadata;
  getOffers(queries: RetailOfferQuery[]): Promise<RetailerOffer[]>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(providerId: string, missing: string[]) {
    super(`Provider "${providerId}" is not configured. Missing: ${missing.join(", ")}`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}
