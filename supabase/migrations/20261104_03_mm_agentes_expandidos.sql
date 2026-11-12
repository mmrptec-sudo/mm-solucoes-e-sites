-- Amplia os agentes autorizados em tabelas já existentes. Aplicar após a migração base.
DO $$ BEGIN
 IF to_regclass('public.mm_tarefas') IS NOT NULL THEN
  ALTER TABLE public.mm_tarefas DROP CONSTRAINT IF EXISTS mm_tarefas_agente_check;
  ALTER TABLE public.mm_tarefas ADD CONSTRAINT mm_tarefas_agente_check CHECK (agente in ('atlas','max','luna','nexa','vega','price'));
 END IF;
 IF to_regclass('public.mm_ia_mensagens') IS NOT NULL THEN
  ALTER TABLE public.mm_ia_mensagens DROP CONSTRAINT IF EXISTS mm_ia_mensagens_agente_check;
  ALTER TABLE public.mm_ia_mensagens ADD CONSTRAINT mm_ia_mensagens_agente_check CHECK (agente in ('atlas','max','luna','nexa','vega','price'));
 END IF;
 IF to_regclass('public.mm_ia_execucoes') IS NOT NULL THEN
  ALTER TABLE public.mm_ia_execucoes DROP CONSTRAINT IF EXISTS mm_ia_execucoes_agente_check;
  ALTER TABLE public.mm_ia_execucoes ADD CONSTRAINT mm_ia_execucoes_agente_check CHECK (agente in ('atlas','max','luna','nexa','vega','price'));
 END IF;
END $$;
