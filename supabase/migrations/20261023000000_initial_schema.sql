-- Scentify initial schema
-- Catalog (public read, service-role write) + user data (RLS: owner only)
-- + provenance (data_sources, sync_history).

-- gen_random_uuid() is built into Postgres 13+ (no pgcrypto needed).

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Provenance
-- ─────────────────────────────────────────────────────────────
create table public.data_sources (
  id            text primary key,                       -- 'synthetic', 'fragdb', ...
  name          text not null,
  kind          text not null check (kind in ('catalog', 'retail', 'supplementary')),
  license       text,
  attribution   text,
  homepage_url  text,
  commercial_use_verified boolean not null default false,
  is_active     boolean not null default true,
  config        jsonb not null default '{}'::jsonb,     -- non-secret settings only
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger data_sources_updated before update on public.data_sources
  for each row execute function public.set_updated_at();

create table public.sync_history (
  id               uuid primary key default gen_random_uuid(),
  source_id        text not null references public.data_sources(id),
  kind             text not null check (kind in ('catalog', 'prices', 'stock')),
  mode             text not null check (mode in ('full', 'incremental')),
  status           text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at       timestamptz not null,
  finished_at      timestamptz,
  records_fetched  integer not null default 0,
  records_upserted integer not null default 0,
  records_skipped  integer not null default 0,
  duplicates       integer not null default 0,
  issues           jsonb not null default '[]'::jsonb,
  error            text,
  cursor           text
);
create index sync_history_source_idx on public.sync_history (source_id, kind, finished_at desc);

-- ─────────────────────────────────────────────────────────────
-- Catalog
-- ─────────────────────────────────────────────────────────────
create table public.brands (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  tier         text check (tier in ('budget', 'designer', 'niche', 'luxury')),
  country      text,
  is_synthetic boolean not null default false,
  source_id    text references public.data_sources(id),
  created_at   timestamptz not null default now()
);

create table public.notes (
  id              text primary key,                     -- canonical slug, e.g. 'tonka_bean'
  name            text not null,
  note_group      text not null,
  secondary_group text,
  aliases         text[] not null default '{}',
  warmth          numeric(3,2) check (warmth between -1 and 1),
  intensity       numeric(3,2) check (intensity between 0 and 1)
);
create index notes_aliases_idx on public.notes using gin (aliases);

create table public.fragrances (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  brand_id          uuid not null references public.brands(id),
  concentration     text not null check (concentration in ('EDC', 'EDT', 'EDP', 'Parfum', 'Extrait')),
  gender            text not null default 'unisex' check (gender in ('masculine', 'feminine', 'unisex')),
  release_year      smallint,
  description       text not null default '',
  families          text[] not null default '{}',
  accords           jsonb not null default '[]'::jsonb,
  longevity         numeric(3,1) check (longevity between 0 and 10),
  projection        numeric(3,1) check (projection between 0 and 10),
  versatility       numeric(3,1) check (versatility between 0 and 10),
  time_day          numeric(3,2) check (time_day between 0 and 1),
  time_night        numeric(3,2) check (time_night between 0 and 1),
  rating            numeric(3,2) check (rating between 0 and 5),
  popularity        smallint check (popularity between 0 and 100),
  visual            jsonb,
  image_url         text,
  -- Lifecycle: synthetic records can be retired or merged into real ones
  -- without breaking user wishlists/collections (see merge_fragrance()).
  status            text not null default 'active' check (status in ('active', 'retired', 'merged')),
  merged_into       uuid references public.fragrances(id),
  -- Provenance
  is_synthetic      boolean not null default false,
  source_id         text not null references public.data_sources(id),
  source_record_id  text not null,
  source_url        text,
  attribution       text,
  license           text,
  dedupe_key        text not null,
  source_updated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (source_id, source_record_id)
);
create index fragrances_brand_idx on public.fragrances (brand_id);
create index fragrances_status_idx on public.fragrances (status);
create index fragrances_families_idx on public.fragrances using gin (families);
create index fragrances_dedupe_idx on public.fragrances (dedupe_key);
create trigger fragrances_updated before update on public.fragrances
  for each row execute function public.set_updated_at();

create table public.fragrance_notes (
  fragrance_id uuid not null references public.fragrances(id) on delete cascade,
  note_id      text not null references public.notes(id),
  tier         text not null check (tier in ('top', 'middle', 'base')),
  position     smallint not null default 0,
  primary key (fragrance_id, note_id, tier)
);
create index fragrance_notes_note_idx on public.fragrance_notes (note_id);

create table public.fragrance_attributes (
  fragrance_id       uuid primary key references public.fragrances(id) on delete cascade,
  freshness          numeric(3,1) not null default 0,
  sweetness          numeric(3,1) not null default 0,
  woodiness          numeric(3,1) not null default 0,
  spiciness          numeric(3,1) not null default 0,
  warmth             numeric(3,1) not null default 0,
  floralness         numeric(3,1) not null default 0,
  fruitiness         numeric(3,1) not null default 0,
  greenness          numeric(3,1) not null default 0,
  smokiness          numeric(3,1) not null default 0,
  creaminess         numeric(3,1) not null default 0,
  powderiness        numeric(3,1) not null default 0,
  muskiness          numeric(3,1) not null default 0,
  season_spring      numeric(3,2) not null default 0,
  season_summer      numeric(3,2) not null default 0,
  season_autumn      numeric(3,2) not null default 0,
  season_winter      numeric(3,2) not null default 0,
  occasion_work      numeric(3,2) not null default 0,
  occasion_school    numeric(3,2) not null default 0,
  occasion_date      numeric(3,2) not null default 0,
  occasion_casual    numeric(3,2) not null default 0,
  occasion_formal    numeric(3,2) not null default 0,
  occasion_gym       numeric(3,2) not null default 0,
  occasion_night_out numeric(3,2) not null default 0,
  updated_at         timestamptz not null default now()
);

-- Bottle sizes. Separate from offers: one variant can have many retailer prices.
create table public.fragrance_variants (
  id           uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances(id) on delete cascade,
  size_ml      numeric(6,1) not null check (size_ml > 0),
  list_price   numeric(10,2) check (list_price >= 0),
  currency     char(3) not null default 'CAD',
  gtin         text,
  is_synthetic boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (fragrance_id, size_ml)
);
create index fragrance_variants_price_idx on public.fragrance_variants (list_price);
create trigger fragrance_variants_updated before update on public.fragrance_variants
  for each row execute function public.set_updated_at();

create table public.retailer_offers (
  id              uuid primary key default gen_random_uuid(),
  variant_id      uuid not null references public.fragrance_variants(id) on delete cascade,
  source_id       text not null references public.data_sources(id),
  retailer_name   text not null,
  retailer_sku    text not null,
  url             text,
  price           numeric(10,2) not null check (price >= 0),
  original_price  numeric(10,2),
  currency        char(3) not null default 'CAD',
  in_stock        boolean not null default true,
  is_synthetic    boolean not null default false,
  last_checked_at timestamptz not null default now(),
  unique (source_id, retailer_sku)
);
create index retailer_offers_variant_idx on public.retailer_offers (variant_id, price);

create table public.fragrance_related (
  fragrance_id uuid not null references public.fragrances(id) on delete cascade,
  related_id   uuid not null references public.fragrances(id) on delete cascade,
  rank         smallint not null,
  source       text not null default 'computed',
  primary key (fragrance_id, related_id)
);

-- ─────────────────────────────────────────────────────────────
-- User data
-- ─────────────────────────────────────────────────────────────
create table public.user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger user_profiles_updated before update on public.user_profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.user_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  budget_min           numeric(10,2) not null default 0,
  budget_max           numeric(10,2) not null default 250,
  budget_strict        boolean not null default false,
  currency             char(3) not null default 'CAD',
  families             text[] not null default '{}',
  liked_notes          text[] not null default '{}',
  occasions            text[] not null default '{}',
  seasons              text[] not null default '{}',
  strength             smallint not null default 3 check (strength between 1 and 5),
  longevity_importance smallint not null default 3 check (longevity_importance between 1 and 5),
  versatility          text not null default 'no_preference' check (versatility in ('versatile', 'specific', 'no_preference')),
  excluded_notes       text[] not null default '{}',   -- hard exclusions
  disliked_notes       text[] not null default '{}',   -- soft dislikes
  disliked_traits      text[] not null default '{}',
  updated_at           timestamptz not null default now()
);
create trigger user_preferences_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();

create table public.wishlists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references public.fragrances(id) on delete restrict,
  note         text,
  target_price numeric(10,2),                           -- future: price-drop alerts
  added_at     timestamptz not null default now(),
  unique (user_id, fragrance_id)
);
create index wishlists_user_idx on public.wishlists (user_id, added_at desc);

create table public.user_collections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  fragrance_id   uuid not null references public.fragrances(id) on delete restrict,
  variant_id     uuid references public.fragrance_variants(id) on delete set null,
  size_ml        numeric(6,1),
  is_favorite    boolean not null default false,
  rating         smallint check (rating between 1 and 5),
  personal_notes text check (char_length(personal_notes) <= 2000),
  added_at       timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, fragrance_id)
);
create index user_collections_user_idx on public.user_collections (user_id, added_at desc);
create trigger user_collections_updated before update on public.user_collections
  for each row execute function public.set_updated_at();

create table public.fragrance_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references public.fragrances(id) on delete restrict,
  feedback     text not null check (feedback in ('love', 'not_interested', 'own', 'too_expensive', 'too_sweet', 'too_strong')),
  created_at   timestamptz not null default now(),
  unique (user_id, fragrance_id, feedback)
);
create index fragrance_feedback_user_idx on public.fragrance_feedback (user_id, created_at);

create table public.recommendation_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source         text not null check (source in ('quiz', 'budget', 'today', 'chat', 'discover', 'similar', 'profile')),
  request        jsonb not null default '{}'::jsonb,
  results        jsonb not null default '[]'::jsonb,   -- [{fragranceId, score}]
  engine_version text not null,
  created_at     timestamptz not null default now()
);
create index recommendation_history_user_idx on public.recommendation_history (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.data_sources          enable row level security;
alter table public.sync_history          enable row level security;
alter table public.brands                enable row level security;
alter table public.notes                 enable row level security;
alter table public.fragrances            enable row level security;
alter table public.fragrance_notes       enable row level security;
alter table public.fragrance_attributes  enable row level security;
alter table public.fragrance_variants    enable row level security;
alter table public.retailer_offers       enable row level security;
alter table public.fragrance_related     enable row level security;
alter table public.user_profiles         enable row level security;
alter table public.user_preferences      enable row level security;
alter table public.wishlists             enable row level security;
alter table public.user_collections      enable row level security;
alter table public.fragrance_feedback    enable row level security;
alter table public.recommendation_history enable row level security;

-- Catalog: readable by everyone; writes only via the service role (bypasses RLS).
create policy "catalog read" on public.data_sources         for select using (true);
create policy "catalog read" on public.brands               for select using (true);
create policy "catalog read" on public.notes                for select using (true);
create policy "catalog read" on public.fragrances           for select using (true);
create policy "catalog read" on public.fragrance_notes      for select using (true);
create policy "catalog read" on public.fragrance_attributes for select using (true);
create policy "catalog read" on public.fragrance_variants   for select using (true);
create policy "catalog read" on public.retailer_offers      for select using (true);
create policy "catalog read" on public.fragrance_related    for select using (true);
-- sync_history: no public policies (service role only).

-- User data: owner only.
create policy "own profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wishlist" on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collection" on public.user_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own feedback" on public.fragrance_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own history" on public.recommendation_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Denormalized read model consumed by the app's catalog repository.
-- security_invoker → respects the caller's RLS.
-- ─────────────────────────────────────────────────────────────
create or replace view public.catalog_fragrances
with (security_invoker = true) as
select
  f.id, f.slug, f.name, f.concentration, f.gender, f.release_year, f.description,
  f.families, f.accords, f.longevity, f.projection, f.versatility, f.time_day, f.time_night,
  f.rating, f.popularity, f.visual, f.image_url, f.is_synthetic, f.source_id,
  f.source_record_id, f.source_url, f.attribution, f.license, f.source_updated_at,
  b.name as brand_name, b.slug as brand_slug, b.tier as brand_tier,
  to_jsonb(a) - 'fragrance_id' - 'updated_at' as attributes,
  coalesce((
    select jsonb_object_agg(t.tier, t.ids) from (
      select fn.tier, jsonb_agg(fn.note_id order by fn.position) as ids
      from public.fragrance_notes fn where fn.fragrance_id = f.id group by fn.tier
    ) t
  ), '{}'::jsonb) as notes,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', v.id, 'sizeMl', v.size_ml, 'price', v.list_price,
      'currency', v.currency, 'isSynthetic', v.is_synthetic) order by v.size_ml)
    from public.fragrance_variants v where v.fragrance_id = f.id
  ), '[]'::jsonb) as variants,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'variantId', o.variant_id, 'retailer', o.retailer_name, 'price', o.price,
      'currency', o.currency, 'url', o.url, 'inStock', o.in_stock,
      'lastCheckedAt', o.last_checked_at, 'isSynthetic', o.is_synthetic))
    from public.retailer_offers o join public.fragrance_variants v2 on v2.id = o.variant_id
    where v2.fragrance_id = f.id
  ), '[]'::jsonb) as offers,
  coalesce((
    select jsonb_agg(r.related_id order by r.rank)
    from public.fragrance_related r where r.fragrance_id = f.id
  ), '[]'::jsonb) as related_ids
from public.fragrances f
join public.brands b on b.id = f.brand_id
left join public.fragrance_attributes a on a.fragrance_id = f.id
where f.status = 'active';

-- ─────────────────────────────────────────────────────────────
-- Synthetic → real migration: repoint user data, then retire the old record.
-- ─────────────────────────────────────────────────────────────
create or replace function public.merge_fragrance(old_id uuid, new_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if old_id = new_id then return; end if;

  -- Wishlists / collections / feedback: move rows, skipping ones that would duplicate.
  update wishlists w set fragrance_id = new_id
   where w.fragrance_id = old_id
     and not exists (select 1 from wishlists x where x.user_id = w.user_id and x.fragrance_id = new_id);
  delete from wishlists where fragrance_id = old_id;

  update user_collections c set fragrance_id = new_id, variant_id = null
   where c.fragrance_id = old_id
     and not exists (select 1 from user_collections x where x.user_id = c.user_id and x.fragrance_id = new_id);
  delete from user_collections where fragrance_id = old_id;

  update fragrance_feedback f set fragrance_id = new_id
   where f.fragrance_id = old_id
     and not exists (select 1 from fragrance_feedback x
                     where x.user_id = f.user_id and x.fragrance_id = new_id and x.feedback = f.feedback);
  delete from fragrance_feedback where fragrance_id = old_id;

  update fragrances set status = 'merged', merged_into = new_id where id = old_id;
end $$;

revoke all on function public.merge_fragrance(uuid, uuid) from public, anon, authenticated;
