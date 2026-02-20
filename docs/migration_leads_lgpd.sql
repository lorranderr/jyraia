-- ============================================================
-- MIGRAÇÃO: Expansão da tabela LEADS + RLS + Policies (LGPD)
-- Projeto: Banco Goiás (N7Tech CRM)
-- Data: 2026-02-20
-- ============================================================
-- INSTRUÇÕES:
--   1. Abra o Supabase Dashboard > SQL Editor
--   2. Cole este script inteiro
--   3. Clique em "Run"
-- ============================================================

-- ============================================================
-- PARTE 1: AJUSTES NA ESTRUTURA EXISTENTE
-- ============================================================

-- 1.1 Tornar "email" opcional (o formulário atual não coleta email)
-- (Usa bloco condicional para não dar erro caso a coluna não exista)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;
  END IF;
END
$$;

-- ============================================================
-- PARTE 2: NOVAS COLUNAS — Dados Operacionais
-- ============================================================
-- São dados usados no dia a dia para gerenciar o lead no Kanban

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_margin        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_summary       text,
  ADD COLUMN IF NOT EXISTS is_active          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_interaction   timestamptz,
  ADD COLUMN IF NOT EXISTS needs_followup     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS objecao_tipo       text,
  ADD COLUMN IF NOT EXISTS followup_count     integer DEFAULT 0;

-- ============================================================
-- PARTE 3: NOVAS COLUNAS — Dados Pessoais (LGPD: sensíveis)
-- ============================================================
-- Informações de identificação pessoal — protegidas por RLS

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS data_nascimento    date,
  ADD COLUMN IF NOT EXISTS estado_civil       text,
  ADD COLUMN IF NOT EXISTS profissao          text,
  ADD COLUMN IF NOT EXISTS renda_mensal       numeric,
  ADD COLUMN IF NOT EXISTS tem_filhos         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qtd_filhos         integer DEFAULT 0;

-- ============================================================
-- PARTE 4: NOVAS COLUNAS — Documentação (LGPD: altamente sensíveis)
-- ============================================================
-- CPF, RG e filiação — dados que exigem máxima proteção

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS cpf                text,
  ADD COLUMN IF NOT EXISTS rg                 text,
  ADD COLUMN IF NOT EXISTS rg_orgao           text,
  ADD COLUMN IF NOT EXISTS nome_pai           text,
  ADD COLUMN IF NOT EXISTS nome_mae           text;

-- ============================================================
-- PARTE 5: NOVAS COLUNAS — Endereço
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS cep                text,
  ADD COLUMN IF NOT EXISTS logradouro         text,
  ADD COLUMN IF NOT EXISTS numero             text,
  ADD COLUMN IF NOT EXISTS bairro             text,
  ADD COLUMN IF NOT EXISTS complemento        text,
  ADD COLUMN IF NOT EXISTS cidade             text,
  ADD COLUMN IF NOT EXISTS estado             text;

-- ============================================================
-- PARTE 6: NOVAS COLUNAS — Histórico Bancário
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ultimo_emprestimo_data   date,
  ADD COLUMN IF NOT EXISTS ultimo_emprestimo_valor  numeric,
  ADD COLUMN IF NOT EXISTS ultimo_emprestimo_banco  text;

-- ============================================================
-- PARTE 7: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Pense no RLS como um "porteiro" que só deixa entrar quem
-- tem o crachá correto. Sem isso, qualquer pessoa com a chave
-- pública do Supabase poderia ler os dados dos seus clientes.

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Forçar RLS inclusive para o owner da tabela (camada extra)
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 8: POLÍTICAS DE ACESSO (POLICIES)
-- ============================================================
-- Cada policy é uma "regra do porteiro". Aqui estamos dizendo:
-- "Só quem está logado no sistema pode ver, criar, editar ou
--  apagar um lead."

-- Limpar policies antigas (caso existam)
DROP POLICY IF EXISTS "leads_select_authenticated" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_authenticated" ON public.leads;
DROP POLICY IF EXISTS "leads_update_authenticated" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_authenticated" ON public.leads;

-- 8.1 LEITURA: Somente usuários logados podem ver leads
CREATE POLICY "leads_select_authenticated"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- 8.2 CRIAÇÃO: Somente usuários logados podem cadastrar leads
CREATE POLICY "leads_insert_authenticated"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8.3 EDIÇÃO: Somente usuários logados podem editar leads
CREATE POLICY "leads_update_authenticated"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8.4 EXCLUSÃO: Somente usuários logados podem excluir leads
CREATE POLICY "leads_delete_authenticated"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- PARTE 9: ÍNDICES PARA PERFORMANCE
-- ============================================================
-- Índices são como "atalhos" no banco de dados. Em vez de
-- procurar linha por linha, o banco vai direto ao resultado.

CREATE INDEX IF NOT EXISTS idx_leads_phone    ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_cpf      ON public.leads (cpf);
CREATE INDEX IF NOT EXISTS idx_leads_status   ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_cidade   ON public.leads (cidade);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON public.leads (created_at DESC);

-- ============================================================
-- PARTE 10: COMENTÁRIOS LGPD (Documentação obrigatória)
-- ============================================================
-- A LGPD exige que dados pessoais sejam documentados.
-- Estes comentários servem como registro técnico de que
-- estamos cientes da natureza sensível desses campos.

COMMENT ON COLUMN public.leads.cpf IS
  'LGPD: Dado pessoal sensível. CPF do titular. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON COLUMN public.leads.rg IS
  'LGPD: Dado pessoal sensível. RG do titular. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON COLUMN public.leads.nome_pai IS
  'LGPD: Dado pessoal. Filiação paterna. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON COLUMN public.leads.nome_mae IS
  'LGPD: Dado pessoal. Filiação materna. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON COLUMN public.leads.renda_mensal IS
  'LGPD: Dado financeiro sensível. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON COLUMN public.leads.data_nascimento IS
  'LGPD: Dado pessoal. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON COLUMN public.leads.cep IS
  'LGPD: Dado de localização. Base legal: execução de contrato (Art. 7, V).';

COMMENT ON TABLE public.leads IS
  'Tabela de leads do CRM. Contém dados pessoais e financeiros protegidos pela LGPD (Lei 13.709/2018). Acesso restrito via RLS a usuários autenticados.';

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
-- Após rodar, verifique no Supabase:
--   1. Table Editor > leads > Deve mostrar todas as novas colunas
--   2. Authentication > Policies > Deve mostrar 4 policies na tabela leads
--   3. O ícone de cadeado (🔒) deve aparecer ao lado de "leads"
-- ============================================================
