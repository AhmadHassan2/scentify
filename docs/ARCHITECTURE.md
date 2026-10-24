# Architecture & recommendation engine

## Design principles

1. **One brain.** The quiz, budget finder, discovery, daily picks, comparison and assistant all call the same engine in `src/lib/recommendation`. Business logic isn't duplicated in features.
2. **Engine is pure.** No React, Next.js, database or network imports. Inputs are `Fragrance[]` plus a `PreferenceProfile`, and outputs are scored, explained results. That makes it trivially testable and portable (e.g. to a worker or edge function).
3. **Hard rules are hard.** A strict budget or an excluded note *removes* candidates before scoring. It is never just a penalty that a great scent match could outweigh.
4. **Transparent learning.** Feedback is an append-only log. Preference adjustments are re-derived from it on each request, so every learned effect is explainable and reversible.
5. **LLMs interpret, never decide.** The assistant translates language into tool arguments. Scores, matches, prices and availability come only from our code and data.

## Data flow

```text
                    ┌───────────────────────────┐
 Provider adapters  │ FragranceDataProvider     │  synthetic · fragdb · parfumdb · OBF
 (scripts/sync)     │  → normalize → validate   │
                    │  → dedupe → upsert        │
                    └────────────┬──────────────┘
                                 ▼
                 Supabase Postgres (or bundled JSON in demo mode)
                                 │  catalog_fragrances view
                                 ▼
               lib/database/catalog.ts  (in-memory cache, 5 min TTL)
                                 │
 request ──► API route ──► Zod validation ──► resolvePersonalization()
                                 │      (user, profile, feedback → adjustments, collection)
                                 ▼
                       lib/recommendation (pure)
           filters → scoring → explain → rank → MMR diversity
                                 │
                                 ▼
                     DTO (summaries + reasons) ──► React UI
```

`resolvePersonalization` (`src/lib/personalization.ts`) is the single place that assembles a user's taste:

- **Signed in:** preferences, feedback, collection and wishlist come from the database.
- **Anonymous:** the browser sends its locally stored quiz profile and feedback with each request.

## Fragrance model

Each record (`src/types/fragrance.ts`) carries:

- top/middle/base notes (canonical note ids)
- families, primary first
- accords (0–100)
- 12 perceptual attributes (0–10)
- season (0–1), occasion (0–1) and day/night suitability
- longevity, projection and versatility (1–10)
- variants (bottle sizes and list prices), kept separate from retailer offers
- rating, popularity, illustration parameters and provenance (`source`)

The **note taxonomy** (`src/lib/fragrance/notes.ts`) gives every note:

- a group (e.g. `woody`, `fresh_spice`)
- a perceptual profile
- warmth (−1…1) and intensity (0…1)
- aliases, used for normalization

A group-affinity table makes note matching fuzzy. Someone who loves bergamot partially matches grapefruit-led fragrances.

## Scoring

### 1. Hard filters (`filters.ts`)

Removed before scoring, with the reason recorded:

- price above a **strict** maximum budget
- contains an **excluded** note (any tier)
- marked *not interested*
- already owned (default when looking for something new)
- explicitly excluded (e.g. the fragrance being viewed)

### 2. Components (`scoring.ts`), each 0–1

| Component | Default weight | How it's computed |
| --- | --- | --- |
| Scent | **35%** | 50% family match (exact = 1, related families via affinity matrix, weighted by family position) + 50% note match (best similarity per liked note × note prominence; top-3 average blended with overall average). Plus a learned adjustment (±0.18 max), minus soft-dislike note penalties and disliked-trait penalties (e.g. sweetness above 6.5 when "overly sweet" is disliked). |
| Occasion | **25%** | 0.7 × mean + 0.3 × min of the selected occasions' suitability. A *versatile* preference blends in versatility; *specific* blends in peak suitability. |
| Budget | **20%** | 1 inside the range; 0.85 below the minimum; linear decay above a *flexible* maximum; extra decay above a learned soft price ceiling. |
| Season | **10%** | Mean suitability across the selected seasons. |
| Strength | **10%** | Projection closeness to the target for the chosen strength (1→2.5 … 5→8.75), blended with longevity according to its stated importance, minus a learned projection cap. |

Dimensions the user didn't express return a neutral `0.7`. Neutral scores don't change the ranking.

Weights live in `config.ts` (`DEFAULT_WEIGHTS`), and every engine entry point accepts overrides.

### 3. Rank and diversify (`engine.ts`, `diversity.ts`)

Results are sorted by score, then rating, then name, which makes ranking deterministic. With `diversify`, the top `3 × limit` are re-selected with Maximal Marginal Relevance (λ = 0.72) using fragrance similarity. The chosen set is then shown best-first.

### 4. Explain (`explain.ts`)

Reasons ("Features vetiver and cedarwood — notes you love", "From $60 (50 ml) — within your budget") and cautions ("Contains tobacco, which you'd rather avoid") are generated from the same intermediate values that produced the score.

### What "92% match" means

The match percentage is `score × 100`, a weighted compatibility score. It is **not** a probability of satisfaction, and the UI says so everywhere it appears.

## Feedback learning (`feedback.ts`)

| Feedback | Effect (derived, reversible) |
| --- | --- |
| Love it | +0.18 per note (scaled by prominence), +0.22 primary / +0.13 secondary family |
| Not interested | Hidden from results; −0.10 per note, −0.12 / −0.07 family |
| Already own it | Excluded when finding something new; added to the collection when signed in |
| Too expensive | Soft price ceiling at 85% of its price |
| Too sweet | Sweetness cap at its sweetness − 1 |
| Too strong | Projection cap at its projection − 1 |

Weights are clamped to [−1, 1], and their total influence passes through `tanh`, so no single click dominates.

## Similarity (`similarity.ts`)

Symmetric, from 0 to 1:

- 40% soft note overlap (tier-weighted, related notes count)
- 25% accord cosine
- 15% family affinity
- 20% attribute closeness

Modes:

- **similar:** pure similarity.
- **affordable:** at most 80% of the price; ranked 85% similarity + 15% savings.
- **stronger:** performance at least +1.
- **lighter:** projection at least 1.5 lower.
- **versatile:** versatility at least +1.5 and at least 7.

Labels are "Very close profile", "Similar profile" or "Related direction", never "dupe".

## Discovery (`discovery.ts`)

Each shelf scores candidates with `relevance = f(personal score, novelty, quality)`, applies MMR, and prefers fragrances not shown on earlier shelves:

- **Hidden Gems:** rating ≥ 4.2 and popularity < 38.
- **Outside Your Comfort Zone:** family novelty ≥ 0.5 against stated, learned and owned families, with a bonus for a "bridge" note the user already likes.
- **Similar to Your Favourites:** neighbours of favourites and loved fragrances.
- **Fresh / Warm & Spicy:** attribute thresholds, ranked by personal fit.
- **Luxury Picks:** niche and luxury tiers, scored on taste with the budget component ignored. A strict budget still applies.
- **Budget-Friendly Finds:** at most $90, ranked by fit and quality.

## Weather context (`context.ts`)

Temperature (feels-like) maps to season weights by interpolating anchors (−5 °C winter … 28 °C summer). The score blends:

- 30% temperature fit
- 25% occasion
- 10% conditions (humid heat penalizes sweet or loud scents; rain favours woods and greens; snow favours warmth)
- 10% time of day
- 10% projection (quiet occasions penalize projection above 7)
- 15% personal (favourite or rating from the collection, or scent fit for catalog fallbacks)

Location is only ever a typed city or browser-approved coordinates, rounded to about 1 km.

## Synthetic data (`providers/synthetic`)

`generator.ts` samples notes from 18 olfactive archetypes using a seeded PRNG. Everything else is **derived from the notes and concentration**:

- attributes: a weighted mean blended with the most prominent note
- a thermal index, which drives seasons and day/night
- occasion formulas
- performance, from concentration plus base-note intensity
- accords
- versatility, from season and occasion coverage
- related fragrances

That's why records stay internally consistent, and why the same function (`enrichFromNotes`) can fill gaps for real providers that ship notes but no attributes.

## Persistence and security

- `UserDataStore` has two implementations: `SupabaseUserStore` (RLS-enforced, cookie-bound client) and `LocalUserStore` (serialized JSON writes for demo mode).
- Every API route validates input with Zod (`lib/validation/schemas.ts`), checks auth for writes, and returns consistent `{ error }` bodies.
- `proxy.ts` refreshes Supabase sessions and redirects signed-out visitors away from `/wishlist` and `/collection`. Pages re-check server-side.
- Chat replies render through a safe mini-markdown renderer (no HTML injection, internal links only).
