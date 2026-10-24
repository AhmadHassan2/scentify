import {
  FragDBAdapter,
  OpenBeautyFactsAdapter,
  ParfumDBAdapter,
} from "./adapters";
import { SyntheticFragranceProvider } from "./synthetic/synthetic-provider";
import type { FragranceDataProvider } from "./types";

const FACTORIES: Record<string, () => FragranceDataProvider> = {
  synthetic: () => new SyntheticFragranceProvider(),
  fragdb: () => new FragDBAdapter(),
  parfumdb: () => new ParfumDBAdapter(),
  "open-beauty-facts": () => new OpenBeautyFactsAdapter(),
};

export const PROVIDER_IDS = Object.keys(FACTORIES);

export function getProvider(id: string): FragranceDataProvider {
  const factory = FACTORIES[id];
  if (!factory) throw new Error(`Unknown provider "${id}". Known: ${PROVIDER_IDS.join(", ")}`);
  return factory();
}
