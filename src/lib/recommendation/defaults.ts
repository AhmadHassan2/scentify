import type { PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";

export function defaultProfile(): PreferenceProfile {
  return {
    budget: { min: 0, max: 250, currency: "CAD", strict: false },
    families: [],
    likedNotes: [],
    occasions: [],
    seasons: [],
    strength: 3,
    longevityImportance: 3,
    versatility: "no_preference",
    excludedNotes: [],
    dislikedNotes: [],
    dislikedTraits: [],
  };
}

export function emptyAdjustments(): PreferenceAdjustments {
  return {
    noteWeights: {},
    familyWeights: {},
    attributeCaps: {},
    projectionCap: null,
    softPriceCeiling: null,
    hiddenFragranceIds: [],
    lovedFragranceIds: [],
    ownedFragranceIds: [],
  };
}

/** Shallow-merge a partial profile (e.g. from the chatbot) onto a base profile. */
export function mergeProfile(
  base: PreferenceProfile,
  patch: Partial<Omit<PreferenceProfile, "budget">> & {
    budget?: Partial<PreferenceProfile["budget"]>;
  },
): PreferenceProfile {
  return {
    ...base,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    budget: { ...base.budget, ...(patch.budget ?? {}) },
  } as PreferenceProfile;
}

/** True when the profile carries no taste information at all. */
export function isBlankProfile(p: PreferenceProfile): boolean {
  return (
    p.families.length === 0 &&
    p.likedNotes.length === 0 &&
    p.occasions.length === 0 &&
    p.seasons.length === 0
  );
}
