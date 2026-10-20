-- Leftovers book: half-used ingredients. Added automatically when a recipe is cooked ("I've finished"),
-- or typed in by the user. "Remix" builds a new recipe from them.
create table public.leftover_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  amount_text text not null default '',
  use_by date,
  recipe_id uuid references public.recipes on delete set null,
  created_at timestamptz not null default now()
);
create index leftover_items_user on public.leftover_items (user_id, use_by);

alter table public.leftover_items enable row level security;
create policy "own leftovers" on public.leftover_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.leftover_items to authenticated;
