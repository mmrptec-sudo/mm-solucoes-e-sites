-- MM Intelligence v2 · migração ADITIVA. Execute em staging antes de produção.
-- Pré-requisitos: public.empresas(id uuid), public.empresa_usuarios(empresa_id uuid, usuario_id uuid)
-- NÃO altera pedidos, lojas, autenticação ou integrações existentes.
begin;

create table if not exists public.mm_clientes (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 nome text not null check (length(trim(nome)) between 2 and 120),
 email text, telefone text, etapa text not null default 'cliente' check (etapa in ('lead','proposta','cliente','inativo')),
 observacoes text not null default '', criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists idx_mm_clientes_empresa on public.mm_clientes (empresa_id, criado_em desc);

create table if not exists public.mm_produtos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 sku text not null check (length(trim(sku)) between 1 and 90), nome text not null check (length(trim(nome)) between 2 and 160),
 custo numeric(16,2) not null default 0 check (custo>=0), preco numeric(16,2) not null default 0 check (preco>=0),
 estoque numeric(16,3) not null default 0 check (estoque>=0), minimo numeric(16,3) not null default 0 check (minimo>=0),
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), unique (empresa_id,sku)
);
create index if not exists idx_mm_produtos_empresa on public.mm_produtos (empresa_id);

create table if not exists public.mm_lancamentos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 descricao text not null check (length(trim(descricao)) between 2 and 180),
 tipo text not null check (tipo in ('entrada','saida')),
 categoria text not null default 'Outros', valor numeric(16,2) not null check (valor>0),
 vencimento date not null default current_date, pago boolean not null default false,
 data_pagamento date, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists idx_mm_lancamentos_empresa on public.mm_lancamentos (empresa_id,vencimento desc);

create table if not exists public.mm_orcamentos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 cliente text not null check (length(trim(cliente)) between 2 and 120),
 descricao text not null check (length(trim(descricao)) between 2 and 180),
 valor numeric(16,2) not null check (valor>=0),
 etapa text not null default 'rascunho' check (etapa in ('rascunho','enviado','aprovado','recusado')),
 data_prevista date, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists idx_mm_orcamentos_empresa on public.mm_orcamentos (empresa_id,criado_em desc);

create table if not exists public.mm_tarefas (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 titulo text not null check (length(trim(titulo)) between 2 and 180),
 agente text not null default 'atlas' check (agente in ('atlas','max','luna','nexa','vega','price')),
 prioridade text not null default 'normal' check (prioridade in ('baixa','normal','alta')),
 prazo date, concluida boolean not null default false,
 origem text not null default 'manual' check (origem in ('manual','sugestao_ia')),
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists idx_mm_tarefas_empresa on public.mm_tarefas (empresa_id,concluida,criado_em desc);

create table if not exists public.mm_ia_mensagens (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 usuario_id uuid not null references auth.users(id) on delete cascade,
 agente text not null check (agente in ('atlas','max','luna','nexa','vega','price')),
 papel text not null check (papel in ('user','assistant')),
 conteudo text not null check (char_length(conteudo) between 1 and 8000),
 modo text not null default 'analise_guiada' check (modo in ('analise_guiada','ia_conectada')),
 criado_em timestamptz not null default now()
);
create index if not exists idx_mm_ia_mensagens_empresa on public.mm_ia_mensagens (empresa_id,usuario_id,criado_em desc);

create table if not exists public.mm_ia_execucoes (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 usuario_id uuid not null references auth.users(id) on delete cascade,
 agente text not null check (agente in ('atlas','max','luna','nexa','vega','price')),
 modelo text not null, tokens_entrada integer check (tokens_entrada>=0), tokens_saida integer check (tokens_saida>=0),
 criado_em timestamptz not null default now()
);
create index if not exists idx_mm_ia_execucoes_empresa on public.mm_ia_execucoes (empresa_id,criado_em desc);

-- Separação de tenants: usuário autenticado e membro da empresa.
-- Não habilitar INSERT/UPDATE de execuções pelo navegador.
create or replace function public.mm_eh_membro(p_empresa_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists (select 1 from public.empresa_usuarios eu
 where eu.empresa_id=p_empresa_id and eu.usuario_id=(select auth.uid()))
$$;
create or replace function public.mm_eh_admin(p_empresa_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists (select 1 from public.empresa_usuarios eu
 where eu.empresa_id=p_empresa_id and eu.usuario_id=(select auth.uid()) and eu.papel='admin')
$$;
revoke all on function public.mm_eh_admin(uuid) from public;
grant execute on function public.mm_eh_admin(uuid) to authenticated;
revoke all on function public.mm_eh_membro(uuid) from public;
grant execute on function public.mm_eh_membro(uuid) to authenticated;

alter table public.mm_clientes enable row level security;
alter table public.mm_produtos enable row level security;
alter table public.mm_lancamentos enable row level security;
alter table public.mm_tarefas enable row level security;
alter table public.mm_orcamentos enable row level security;
alter table public.mm_ia_mensagens enable row level security;
alter table public.mm_ia_execucoes enable row level security;

-- Policies idempotentes: utilitário de DO somente para tabelas criadas por esta migração.
do $$ declare t text; begin
 foreach t in array array['mm_clientes','mm_produtos','mm_lancamentos','mm_tarefas','mm_orcamentos'] loop
  execute format('drop policy if exists mm_member_read on public.%I', t);
  execute format('drop policy if exists mm_member_insert on public.%I', t);
  execute format('drop policy if exists mm_member_update on public.%I', t);
  execute format('drop policy if exists mm_member_delete on public.%I', t);
  execute format('create policy mm_member_read on public.%I for select to authenticated using (public.%s(empresa_id))', t, case when t='mm_lancamentos' then 'mm_eh_admin' else 'mm_eh_membro' end);
  execute format('create policy mm_member_insert on public.%I for insert to authenticated with check (public.%s(empresa_id))', t, case when t='mm_tarefas' then 'mm_eh_membro' else 'mm_eh_admin' end);
  execute format('create policy mm_member_update on public.%I for update to authenticated using (public.%s(empresa_id)) with check (public.%s(empresa_id))', t, case when t='mm_tarefas' then 'mm_eh_membro' else 'mm_eh_admin' end, case when t='mm_tarefas' then 'mm_eh_membro' else 'mm_eh_admin' end);
  execute format('create policy mm_member_delete on public.%I for delete to authenticated using (public.%s(empresa_id))', t, case when t='mm_tarefas' then 'mm_eh_membro' else 'mm_eh_admin' end);
 end loop;
end $$;

drop policy if exists mm_messages_read on public.mm_ia_mensagens;
create policy mm_messages_read on public.mm_ia_mensagens for select to authenticated
using (usuario_id=(select auth.uid()) and public.mm_eh_membro(empresa_id));
-- Escritas das mensagens são feitas SOMENTE no servidor após checagem de membro.
drop policy if exists mm_usage_read on public.mm_ia_execucoes;
create policy mm_usage_read on public.mm_ia_execucoes for select to authenticated
using (public.mm_eh_admin(empresa_id));

revoke all on public.mm_clientes,public.mm_produtos,public.mm_lancamentos,public.mm_tarefas,
public.mm_orcamentos,public.mm_ia_mensagens,public.mm_ia_execucoes from anon;
grant select,insert,update,delete on public.mm_clientes, public.mm_produtos, public.mm_lancamentos, public.mm_tarefas, public.mm_orcamentos to authenticated;
grant select on public.mm_ia_mensagens, public.mm_ia_execucoes to authenticated;
commit;
