-- Frankly schema. Every row belongs to one (anonymous) Supabase user.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade default auth.uid(),
  name text not null default '',
  cooks_for text not null default 'self' check (cooks_for in ('self', 'others')),
  household_size int not null default 1 check (household_size between 1 and 20),
  spice int not null default 5 check (spice between 1 and 10),
  seasoning int not null default 5 check (seasoning between 1 and 10),
  difficulty int not null default 5 check (difficulty between 1 and 10),
  cuisines text[] not null default '{}',
  diets text[] not null default '{}',
  allergens text[] not null default '{}',
  appliances text[] not null default '{}',
  stores text[] not null default '{}',
  meals_per_week int,
  zip text,
  lat double precision,
  lng double precision,
  -- Nearest Kroger-family stores, cached from the Kroger Locations API.
  kroger_stores jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per generated recipe. status moves draft -> active/saved -> cooked.
-- 'dismissed' = "I'm not feeling this" (kept so Frankly learns what you skip).
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'saved', 'cooked', 'dismissed')),
  dish_query text not null,
  title text not null,
  cuisine text,
  servings int not null,
  budget numeric,
  leftovers text not null default 'some' check (leftovers in ('none', 'some', 'lots')),
  est_total numeric,
  data jsonb not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  cooked_at timestamptz
);
create index recipes_user_status on public.recipes (user_id, status, created_at desc);

-- "I've finished" answers.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  enjoyment int not null check (enjoyment between 1 and 10),
  cooking_enjoyment int not null check (cooking_enjoyment between 1 and 10),
  price_accuracy int not null check (price_accuracy between 1 and 10),
  leftovers text not null check (leftovers in ('less', 'as_expected', 'more')),
  created_at timestamptz not null default now()
);

-- Internal pantry (no pantry screen yet): long-lasting staples the user has bought,
-- so Frankly doesn't tell them to buy salt for every recipe.
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  is_staple boolean not null default true,
  recipe_id uuid references public.recipes on delete set null,
  added_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.feedback enable row level security;
alter table public.pantry_items enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own recipes" on public.recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own feedback" on public.feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own pantry" on public.pantry_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Explicit table access for signed-in users (anonymous sign-ins use the `authenticated` role).
-- Needed when the project's "Automatically expose new tables" setting is off; harmless when it's on.
-- Row-level security above still limits every user to their own rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.recipes, public.feedback, public.pantry_items to authenticated;
