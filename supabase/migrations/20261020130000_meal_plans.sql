-- Meal Plan book: 3-7 dinners for the week that share ingredients, with one combined grocery list.
-- Each dinner is a normal recipe row with the new status 'planned' (and data.plan_id), so the usual
-- recipe page, "Let's go" and "I've finished" work for it.

alter table public.recipes drop constraint recipes_status_check;
alter table public.recipes add constraint recipes_status_check
  check (status in ('draft', 'active', 'saved', 'cooked', 'dismissed', 'planned'));

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  meals int not null check (meals between 3 and 7),
  servings int not null check (servings between 1 and 20),
  budget numeric not null,
  recipe_ids uuid[] not null default '{}',
  -- grocery list (priced per store), totals, recommended store, budget check, savings vs. separate recipes
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index meal_plans_user on public.meal_plans (user_id, created_at desc);

alter table public.meal_plans enable row level security;
create policy "own meal plans" on public.meal_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.meal_plans to authenticated;
