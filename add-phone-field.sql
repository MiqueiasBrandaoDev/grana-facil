-- 📱 ADICIONAR CAMPO PHONE À TABELA USERS MANUALMENTE
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna phone se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
        RAISE NOTICE 'Coluna phone adicionada à tabela users';
    ELSE
        RAISE NOTICE 'Coluna phone já existe na tabela users';
    END IF;
END $$;

-- 2. Criar índice único para phone (permitindo NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_phone'
    ) THEN
        CREATE UNIQUE INDEX idx_users_phone 
        ON public.users(phone) 
        WHERE phone IS NOT NULL;
        RAISE NOTICE 'Índice idx_users_phone criado';
    ELSE
        RAISE NOTICE 'Índice idx_users_phone já existe';
    END IF;
END $$;

-- 3. Adicionar comentário
COMMENT ON COLUMN public.users.phone IS 'Número de telefone do usuário para WhatsApp (formato: 5511999999999)';

-- 4. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;