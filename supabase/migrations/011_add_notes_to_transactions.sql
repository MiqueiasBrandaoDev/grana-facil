-- ===================================================================
-- MIGRATION 011: ADICIONAR COLUNA NOTES À TABELA TRANSACTIONS
-- ===================================================================

-- Adicionar coluna notes para permitir observações nas transações
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;