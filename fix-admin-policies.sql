-- Fix admin policies - Execute este script no Supabase SQL Editor

-- Temporariamente desabilitar RLS para debug
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deploy_history DISABLE ROW LEVEL SECURITY;

-- Garantir que a tabela admin_users existe e tem dados
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inserir admin user se não existir
INSERT INTO public.admin_users (email, name, role, is_active) 
SELECT 'miqueiasbrandaogyn@gmail.com', 'Miqueias Brandão', 'super_admin', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE email = 'miqueiasbrandaogyn@gmail.com'
);

-- Verificar se o usuário foi inserido
SELECT * FROM public.admin_users WHERE email = 'miqueiasbrandaogyn@gmail.com';

-- Criar tabelas de log e deploy se não existirem
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.deploy_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE NOT NULL,
    admin_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    branch TEXT DEFAULT 'main',
    commit_hash TEXT,
    logs TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_deploy_history_admin_id ON public.deploy_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_deploy_history_status ON public.deploy_history(status);
CREATE INDEX IF NOT EXISTS idx_deploy_history_started_at ON public.deploy_history(started_at);

-- Adicionar trigger de updated_at se não existir
DROP TRIGGER IF EXISTS handle_updated_at_admin_users ON public.admin_users;
CREATE TRIGGER handle_updated_at_admin_users
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();