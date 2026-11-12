-- MM Intelligence | Central de Operações
-- Migração ADITIVA: não modifica tabelas de pedidos, financeiro ou integrações.
-- Aplicar depois da migração que cria public.mm_eh_membro(uuid).
begin;

create table if not exists public.mm_central_operacoes (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  documento jsonb not null default '{}'::jsonb check (jsonb_typeof(documento) = 'object'),
  versao bigint not null default 0 check (versao >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

alter table public.mm_central_operacoes enable row level security;
drop policy if exists mm_operacoes_read on public.mm_central_operacoes;
create policy mm_operacoes_read on public.mm_central_operacoes
  for select to authenticated using (public.mm_eh_membro(empresa_id));

-- Escritas só por RPC com checagem de membro e versão.
revoke all on public.mm_central_operacoes from anon, authenticated;
grant select on public.mm_central_operacoes to authenticated;

create or replace function public.mm_operacoes_salvar(
  p_empresa_id uuid, p_documento jsonb, p_versao bigint
) returns bigint
language plpgsql security definer set search_path = public
as $$
declare v_proxima bigint;
begin
  if auth.uid() is null or not public.mm_eh_membro(p_empresa_id) then
    raise exception 'Sem permissão para gravar dados desta empresa' using errcode='42501';
  end if;
  if p_documento is null or jsonb_typeof(p_documento) <> 'object' then
    raise exception 'Documento operacional inválido' using errcode='22023';
  end if;
  if octet_length(p_documento::text) > 12582912 then
    raise exception 'Limite de 12 MB para snapshot operacional: exporte e arquive registros antigos' using errcode='22023';
  end if;
  if p_versao is null or p_versao < 0 then
    raise exception 'Versão inválida' using errcode='22023';
  end if;

  insert into public.mm_central_operacoes (empresa_id, documento, versao, atualizado_por)
    values (p_empresa_id, p_documento, 1, auth.uid())
    on conflict (empresa_id) do update
      set documento = excluded.documento,
          versao = public.mm_central_operacoes.versao + 1,
          atualizado_em = now(), atualizado_por = auth.uid()
      where public.mm_central_operacoes.versao = p_versao
    returning versao into v_proxima;

  -- Em uma criação concorrente com versão != 0, o WHERE acima impede sobrescrita.
  if v_proxima is null or (p_versao = 0 and v_proxima > 1) then
    raise exception 'Conflito de versão: a empresa foi alterada por outra sessão. Exporte seu backup e recarregue.' using errcode='40001';
  end if;
  return v_proxima;
end;
$$;

revoke all on function public.mm_operacoes_salvar(uuid,jsonb,bigint) from public, anon;
grant execute on function public.mm_operacoes_salvar(uuid,jsonb,bigint) to authenticated;
commit;
