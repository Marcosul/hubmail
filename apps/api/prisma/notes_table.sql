-- Executar no SQL Editor do Supabase (novo projecto a partir da integração Vercel).
-- Tabela de exemplo; ajusta políticas RLS consoante a tua app.

create table if not exists public.notes (
  id bigint primary key generated always as identity,
  title text not null
);

insert into public.notes (title)
values
  ('Today I created a Supabase project.'),
  ('I added some data and queried it from Next.js.'),
  ('It was awesome!');

alter table public.notes enable row level security;

create policy "public can read notes"
  on public.notes
  for select
  to anon
  using (true);
