# Migrating from synthetic to real data

Users will have wishlists, collections and feedback pointing at synthetic fragrance ids. The schema is designed so you can replace the catalog **without breaking those relationships**.

## Building blocks

- `wishlists`, `user_collections` and `fragrance_feedback` reference `fragrances(id)` with `ON DELETE RESTRICT`. A fragrance with user data attached can't be deleted by accident.
- `fragrances.status` is `active`, `retired` or `merged`, and `merged_into` points to the replacement. The `catalog_fragrances` view only exposes `active` rows.
- `public.merge_fragrance(old_id, new_id)` (service role only) moves wishlist, collection and feedback rows to the new id, skipping rows that would duplicate. It then marks the old record `merged`. This behaviour is tested in `tests/schema.test.ts`.
- `fragrances.is_synthetic` and `source_id` identify where every record came from.

## Recommended rollout

1. **Import real data alongside synthetic.** Run your provider sync. Real records get their own ids (`providerId:externalId` → UUID) and `is_synthetic = false`.
2. **Decide the fate of each synthetic record.** Synthetic products are fictional, so there's normally no true equivalent. Choose a policy:
   - **Retire:** `update fragrances set status = 'retired' where is_synthetic`. User rows remain valid and still reference the record. Show those items as "no longer available" in the wishlist or collection, and suggest `findSimilar` alternatives from the real catalog.
   - **Map to the nearest real record:** compute candidates with `fragranceSimilarity` (or have users confirm), then call `select merge_fragrance(old, new)` per pair.
3. **Hide synthetic data in the UI.** Remove `DemoBanner` from `app/layout.tsx` and the "Demo price" labels. They are driven by `isSynthetic`, so they disappear automatically once records are real.
4. **Switch the source.** Set `CATALOG_SOURCE=supabase` (the default when Supabase is configured).
5. **Recompute related links** with a full sync, then `replaceRelated()`.
6. **Monitor:** check `sync_history`, `adapter.unknownNotes` (extend `src/lib/fragrance/notes.ts`), and the share of records without variants (they stay hidden until priced).

## Example: retire everything synthetic

```sql
begin;
update public.fragrances set status = 'retired' where is_synthetic and status = 'active';
-- user rows still point at retired ids; nothing is lost
commit;
```

## Example: merge a mapped pair

```sql
select public.merge_fragrance('<synthetic-uuid>', '<real-uuid>');
```

Run merges in batches inside a transaction, and keep the old-to-new mapping table for auditing.

## Local demo users

Demo-mode accounts in `./.data/demo-store.json` are for development only and aren't migrated to Supabase. Users of a deployed app should always be on Supabase Auth.
