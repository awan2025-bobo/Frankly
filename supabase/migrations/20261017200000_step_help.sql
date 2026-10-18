-- Frankly helper ("Need help with this step?"): every question is logged so we can
-- rate-limit per user and review off-topic attempts.
create table public.help_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  recipe_id uuid references public.recipes on delete set null,
  step_index int,
  question text not null check (char_length(question) <= 300),
  on_topic boolean,
  created_at timestamptz not null default now()
);
create index help_questions_user_time on public.help_questions (user_id, created_at desc);

alter table public.help_questions enable row level security;
create policy "own help questions" on public.help_questions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert on public.help_questions to authenticated;
