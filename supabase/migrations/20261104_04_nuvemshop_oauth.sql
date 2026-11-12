-- MM Intelligence 5.0: conexões OAuth Nuvemshop. Execute após backup e em homologação.
-- As duas tabelas NÃO possuem políticas RLS para acesso direto do cliente;
-- somente rotas de servidor verificadas com service_role podem consultá-las.
create table if not exists public.nuvemshop_oauth_sessoes (
  state_hash text primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
alter table public.nuvemshop_oauth_sessoes enable row level security;
revoke all on public.nuvemshop_oauth_sessoes from anon, authenticated;

create table if not exists public.nuvemshop_conexoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  app_id text not null,
  store_id text not null,
  nome_loja text not null,
  status text not null default 'conectada',
  scopes text not null default '',
  access_token_criptografado text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (app_id, store_id)
);
create index if not exists nuvemshop_conexoes_empresa_idx on public.nuvemshop_conexoes(empresa_id);
alter table public.nuvemshop_conexoes enable row level security;
revoke all on public.nuvemshop_conexoes from anon, authenticated;
