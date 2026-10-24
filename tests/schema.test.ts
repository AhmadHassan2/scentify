import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { rowToFragrance, type CatalogRow } from "@/lib/database/mappers";
import { catalog } from "./fixtures";

/**
 * Runs the real migrations + generated seed against embedded Postgres
 * (PGlite) with a minimal stand-in for Supabase's `auth` schema.
 */

const root = resolve(import.meta.dirname, "..");
const SUPABASE_STUB = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
`;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = resolve(root, "supabase/migrations");
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(resolve(dir, file), "utf8"));
  await db.exec(readFileSync(resolve(root, "supabase/seed/seed.sql"), "utf8"));
}, 60_000);

describe("database schema + seed", () => {
  it("seeds every synthetic fragrance into the catalog view", async () => {
    const { rows } = await db.query<{ count: number }>("select count(*)::int as count from public.catalog_fragrances");
    expect(rows[0].count).toBe(catalog.length);
  });

  it("round-trips through the view and mapper without losing data", async () => {
    const original = catalog[7];
    const { rows } = await db.query<CatalogRow>("select * from public.catalog_fragrances where id = $1", [original.id]);
    const mapped = rowToFragrance(rows[0]);
    expect(mapped.notes).toEqual(original.notes);
    expect(mapped.variants).toEqual(original.variants);
    expect(mapped.attributes).toEqual(original.attributes);
    expect(mapped.seasons).toEqual(original.seasons);
    expect(mapped.occasions).toEqual(original.occasions);
    expect(mapped.relatedIds).toEqual(original.relatedIds);
    expect(mapped.isSynthetic).toBe(true);
  });

  it("is idempotent: re-running the seed does not duplicate records", async () => {
    await db.exec(readFileSync(resolve(root, "supabase/seed/seed.sql"), "utf8"));
    const { rows } = await db.query<{ count: number }>("select count(*)::int as count from public.fragrance_variants");
    expect(rows[0].count).toBe(catalog.reduce((s, f) => s + f.variants.length, 0));
  });

  it("merge_fragrance() repoints user data and retires the old record", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const [oldF, newF] = [catalog[0], catalog[1]];
    await db.query("insert into auth.users (id, email) values ($1, 'a@example.com')", [userId]);
    await db.query("insert into public.wishlists (user_id, fragrance_id) values ($1, $2)", [userId, oldF.id]);
    await db.query("insert into public.user_collections (user_id, fragrance_id, is_favorite) values ($1, $2, true)", [userId, oldF.id]);
    await db.query("select public.merge_fragrance($1, $2)", [oldF.id, newF.id]);

    const wish = await db.query<{ fragrance_id: string }>("select fragrance_id from public.wishlists where user_id = $1", [userId]);
    expect(wish.rows.map((r) => r.fragrance_id)).toEqual([newF.id]);
    const coll = await db.query<{ fragrance_id: string; is_favorite: boolean }>("select fragrance_id, is_favorite from public.user_collections where user_id = $1", [userId]);
    expect(coll.rows).toEqual([{ fragrance_id: newF.id, is_favorite: true }]);
    const status = await db.query<{ status: string }>("select status from public.fragrances where id = $1", [oldF.id]);
    expect(status.rows[0].status).toBe("merged");
    const visible = await db.query("select 1 from public.catalog_fragrances where id = $1", [oldF.id]);
    expect(visible.rows).toHaveLength(0);
  });

  it("creates a profile row automatically for new auth users", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users (id, email) values ($1, 'jordan@example.com')", [id]);
    const { rows } = await db.query<{ display_name: string }>("select display_name from public.user_profiles where id = $1", [id]);
    expect(rows[0].display_name).toBe("jordan");
  });

  it("row level security isolates users' private data", async () => {
    const alice = "33333333-3333-4333-8333-333333333333";
    const bob = "44444444-4444-4444-8444-444444444444";
    await db.query("insert into auth.users (id, email) values ($1, 'alice@example.com'), ($2, 'bob@example.com')", [alice, bob]);
    await db.query("insert into public.wishlists (user_id, fragrance_id) values ($1, $2)", [bob, catalog[5].id]);
    // Supabase grants table privileges to `authenticated`; RLS policies do the filtering.
    await db.exec("grant usage on schema public, auth to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated;");

    await db.exec(`set request.jwt.sub = '${alice}'; set role authenticated;`);
    try {
      const visible = await db.query("select * from public.wishlists");
      expect(visible.rows).toHaveLength(0);
      await expect(
        db.query("insert into public.wishlists (user_id, fragrance_id) values ($1, $2)", [bob, catalog[6].id]),
      ).rejects.toThrow();
      await db.query("insert into public.wishlists (user_id, fragrance_id) values ($1, $2)", [alice, catalog[6].id]);
      expect((await db.query("select * from public.wishlists")).rows).toHaveLength(1);
      // Catalog stays publicly readable.
      expect((await db.query("select id from public.catalog_fragrances limit 1")).rows).toHaveLength(1);
      // But not writable.
      await expect(db.query("update public.fragrances set name = 'hacked'")).resolves.toMatchObject({ affectedRows: 0 });
    } finally {
      await db.exec("reset role;");
    }
  });

  it("enforces constraints on user data", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    await expect(
      db.query("insert into public.user_collections (user_id, fragrance_id, rating) values ($1, $2, 9)", [id, catalog[3].id]),
    ).rejects.toThrow();
    await expect(
      db.query("insert into public.fragrance_feedback (user_id, fragrance_id, feedback) values ($1, $2, 'meh')", [id, catalog[3].id]),
    ).rejects.toThrow();
  });
});
