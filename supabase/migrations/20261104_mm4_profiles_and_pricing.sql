-- MM Intelligence 4.0: migração ADITIVA. Revisar e aplicar primeiro em homologação.
-- Necessita tabelas existentes: public.empresas, public.empresa_usuarios.

create table if not exists public.mm_price_products (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null check(char_length(trim(nome)) between 2 and 160),
  sku text not null default '',
  canal text not null default 'Mercado Livre',
  preco_atual numeric(14,2) not null default 0 check(preco_atual >= 0),
  custo numeric(14,2) not null default 0 check(custo >= 0),
  frete numeric(14,2) not null default 0 check(frete >= 0),
  taxa_percentual numeric(7,3) not null default 0 check(taxa_percentual between 0 and 100),
  imposto_percentual numeric(7,3) not null default 0 check(imposto_percentual between 0 and 100),
  ads_percentual numeric(7,3) not null default 0 check(ads_percentual between 0 and 100),
  tarifa_fixa numeric(14,2) not null default 0 check(tarifa_fixa >= 0),
  margem_minima numeric(7,3) not null default 5 check(margem_minima between 0 and 95),
  concorrente_preco numeric(14,2) check(concorrente_preco >= 0),
  concorrente_url text,
  concorrente_capturado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  criado_por uuid not null default auth.uid() references auth.users(id)
);
create index if not exists mm_price_products_empresa_idx on public.mm_price_products(empresa_id,atualizado_em desc);
alter table public.mm_price_products enable row level security;

drop policy if exists mm_price_products_read on public.mm_price_products;
create policy mm_price_products_read on public.mm_price_products for select to authenticated
 using(exists(select 1 from public.empresa_usuarios eu where eu.empresa_id=mm_price_products.empresa_id and eu.usuario_id=auth.uid()));
drop policy if exists mm_price_products_insert on public.mm_price_products;
create policy mm_price_products_insert on public.mm_price_products for insert to authenticated
 with check(criado_por=auth.uid() and exists(select 1 from public.empresa_usuarios eu where eu.empresa_id=mm_price_products.empresa_id and eu.usuario_id=auth.uid()));
drop policy if exists mm_price_products_update on public.mm_price_products;
create policy mm_price_products_update on public.mm_price_products for update to authenticated
 using(exists(select 1 from public.empresa_usuarios eu where eu.empresa_id=mm_price_products.empresa_id and eu.usuario_id=auth.uid()))
 with check(exists(select 1 from public.empresa_usuarios eu where eu.empresa_id=mm_price_products.empresa_id and eu.usuario_id=auth.uid()));
drop policy if exists mm_price_products_delete on public.mm_price_products;
create policy mm_price_products_delete on public.mm_price_products for delete to authenticated
 using(exists(select 1 from public.empresa_usuarios eu where eu.empresa_id=mm_price_products.empresa_id and eu.usuario_id=auth.uid()));

-- Fotos privadas. O caminho começa com UUID do usuário autenticado.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mm-avatars','mm-avatars',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists mm_avatar_insert on storage.objects;
create policy mm_avatar_insert on storage.objects for insert to authenticated
 with check(bucket_id='mm-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists mm_avatar_read on storage.objects;
create policy mm_avatar_read on storage.objects for select to authenticated
 using(bucket_id='mm-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists mm_avatar_delete on storage.objects;
create policy mm_avatar_delete on storage.objects for delete to authenticated
 using(bucket_id='mm-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
