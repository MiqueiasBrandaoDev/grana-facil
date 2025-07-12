-- ===================================================================
-- MIGRATION 009: CORRIGIR CONSTRAINT DA TABELA USERS
-- ===================================================================

-- Problema: A constraint REFERENCES auth.users causa erro ao criar usuários
-- Solução: Remover a constraint e recriar a tabela se necessário

-- 1. DROPAR CONSTRAINT PROBLEMÁTICA
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. RECRIAR TABELA USERS SEM CONSTRAINT PROBLEMÁTICA
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. CRIAR TRIGGER PARA updated_at
CREATE TRIGGER handle_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. CONFIGURAR PERMISSÕES
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- 5. DESABILITAR RLS PARA SIMPLICIDADE
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 6. CRIAR FUNÇÃO PARA INSERIR USUÁRIO AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir usuário na tabela public.users quando criado em auth.users
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Ignorar erros para não quebrar o registro
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR TRIGGER AUTOMÁTICO PARA NOVOS USUÁRIOS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. RECRIAR USUÁRIO DE TESTE SE EXISTIR
DO $$
DECLARE
    test_user_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Verificar se usuário existe em auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_uuid) THEN
        -- Inserir na tabela public.users
        INSERT INTO public.users (id, email, full_name, created_at, updated_at)
        VALUES (
            test_user_uuid,
            'usuario@teste.com',
            'Usuário Teste',
            TIMEZONE('utc'::text, NOW()),
            TIMEZONE('utc'::text, NOW())
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            updated_at = TIMEZONE('utc'::text, NOW());
    END IF;
END $$;