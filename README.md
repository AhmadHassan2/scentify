# Scentify

Personalized fragrance discovery: a taste quiz, transparent match scores, a budget finder, weather-aware daily picks, discovery shelves, a wishlist and collection, side-by-side comparison, Fragrance DNA, and a natural-language assistant.

The core value is **our own content-based recommendation engine** working over **structured fragrance data**. The optional AI assistant only interprets language; every match, score and price comes from the engine and the database.

> **Demo data:** the catalog ships with 133 synthetic fragrances from fictional houses, with demonstration prices in CAD. The UI labels this clearly. See [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) for swapping in licensed data.

---

## Quick start (no accounts or keys needed)

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables the app runs fully in **local demo mode**:

| Capability | Without configuration | With configuration |
| --- | --- | --- |
| Catalog | Bundled synthetic JSON | Supabase Postgres (`CATALOG_SOURCE=supabase`) |
| Accounts | Local email/password (scrypt-hashed) in `./.data/demo-store.json` | Supabase Auth |
| Wishlist, collection, feedback, preferences | `./.data/demo-store.json` | Supabase tables with Row Level Security |
| Weather | Live Open-Meteo (free, keyless), plus example presets | Same. Set `WEATHER_MODE=demo` to force example weather |
| Assistant | Built-in deterministic parser + engine tools | OpenAI tool-calling + the same engine tools |

> If `npm install` fails with `EACCES` on `~/.npm`, your npm cache has root-owned files from an old npm bug. Fix it once with `sudo chown -R $(id -u):$(id -g) ~/.npm`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit, integration and schema tests (Vitest + PGlite) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run data:generate` | Regenerate the deterministic synthetic catalog + `supabase/seed/seed.sql` |
| `npm run seed` | Upsert the synthetic catalog into Supabase (service role) |
| `npm run sync -- --provider <id> [--mode full\|incremental] [--dry-run]` | Run a provider sync |

---

## Configuring Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and (for scripts only) `SUPABASE_SERVICE_ROLE_KEY`.
3. Apply the schema, using one of:
   - **SQL editor:** paste `supabase/migrations/20261023000000_initial_schema.sql` and run it.
   - **Supabase CLI:** `supabase link --project-ref <ref>` then `supabase db push`.
4. Seed the catalog with `npm run seed` (or run `supabase/seed/seed.sql` in the SQL editor).
5. Under **Authentication → URL configuration**, set the site URL (e.g. `http://localhost:3000`). Keep email confirmation on or off as you prefer. The register flow handles both.
6. Restart `npm run dev`. `/api/health` reports `"authMode": "supabase"` and `"catalogSource": "supabase"`.

The service-role key is only read by `scripts/*` and must never be exposed to the browser. The app itself uses the anon key plus the user's session, so RLS enforces data ownership in the database.

## Configuring the AI assistant (optional)

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`). The model receives tool definitions (`recommendFragrances`, `searchFragrances`, `compareFragrances`, `getSimilarFragrances`, `getUserCollection`, `getWeatherRecommendations`, `manageWishlist`). It extracts structured preferences as tool arguments, our backend executes them, and the UI renders cards **only from records the tools returned**. If the key is missing or a call fails, the built-in parser handles the request with the same tools.

---

## Project structure

```text
src/
  app/                    Pages (App Router) and API route handlers
    api/                  recommendations, score, budget, similar, today, discover,
                          dna, chat, wishlist, collection, feedback, preferences, me, health
  components/             UI by feature (fragrance, quiz, recommendations, chatbot, …)
    ui/                   shadcn-style primitives (Radix-based)
  hooks/                  useApiQuery, useMatchScores, useLocalStorageValue
  lib/
    recommendation/       ★ standalone engine (pure TypeScript, no framework imports)
    fragrance/            note taxonomy, family affinity, labels, helpers
    providers/            data provider interface, synthetic provider, adapters, sync
    database/             catalog repository, user stores (Supabase + local), mappers
    ai/                   query parser, tools, OpenAI + local assistants
    weather/              Open-Meteo client + demo presets
    auth/                 sessions, server actions, local demo auth
    validation/           Zod schemas for every request
  proxy.ts                Session refresh + protected routes (Next 16 "proxy")
supabase/migrations/      Schema, RLS, catalog view, merge function
supabase/seed/seed.sql    Generated idempotent seed
scripts/                  generate-synthetic-data, seed-fragrances, sync-fragrances
tests/                    Engine, parser, providers, schema/RLS (PGlite)
docs/                     Architecture, data providers, migration guide
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the recommendation engine, scoring and data flow.
- [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md): adding licensed datasets and retail prices, plus scheduled sync.
- [docs/MIGRATION.md](docs/MIGRATION.md): replacing synthetic records without breaking user data.

## Testing

`npm test` runs:

- **Engine:** hard filters, each scoring component, weighting, ranking, determinism, diversity, explanations, similarity modes, feedback learning and reversibility, weather context, discovery and budget search.
- **Dataset integrity:** counts, provenance, unique ids, consistency (warm and sweet scents lean winter; fresh scents lean summer).
- **Assistant parser:** your example prompts, negation ("no oud" vs "don't like tobacco"), prices, refinements.
- **Providers:** normalization, dedupe, validation, adapter enrichment, sync abort on bad data.
- **Database:** the real migration and seed run in PGlite (embedded Postgres), with a view/mapper round-trip, idempotent re-seed, `merge_fragrance()`, the signup trigger, constraints and **Row Level Security isolation between users**.

## Deployment notes

- Local demo mode writes to `./.data`, which isn't suitable for serverless hosting. Configure Supabase for any deployed environment.
- In-memory rate limiting on `/api/chat` and `/api/today` is per instance. Use a shared store (e.g. Upstash Redis) at scale.
- The catalog is cached in memory for 5 minutes per server instance. See `src/lib/database/catalog.ts` for the large-catalog pre-filter guidance.
