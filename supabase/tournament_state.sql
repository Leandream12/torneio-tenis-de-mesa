create table if not exists public.tournament_state (
  id integer primary key check (id = 1),
  data jsonb not null,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.tournament_state enable row level security;

insert into public.tournament_state (id, data, version)
values (
  1,
  '{"format":"knockout-8","players":[],"matches":[],"started":false}'::jsonb,
  0
)
on conflict (id) do nothing;

-- Não crie políticas públicas para esta tabela.
-- O site acessa a tabela somente pelo backend usando SUPABASE_SECRET_KEY.
