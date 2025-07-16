-- Create admin tables for administrative functionality

-- Create admin_users table
CREATE TABLE public.admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create admin_logs table
CREATE TABLE public.admin_logs (
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

-- Create deploy_history table
CREATE TABLE public.deploy_history (
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

-- Create indexes for better performance
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_is_active ON public.admin_users(is_active);

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at);

CREATE INDEX idx_deploy_history_admin_id ON public.deploy_history(admin_id);
CREATE INDEX idx_deploy_history_status ON public.deploy_history(status);
CREATE INDEX idx_deploy_history_started_at ON public.deploy_history(started_at);

-- Create updated_at trigger for admin_users
CREATE TRIGGER handle_updated_at_admin_users
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deploy_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin tables
-- Admin users can view all admin data if they are active admins
CREATE POLICY "Active admins can view admin_users" ON public.admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.is_active = true
        )
    );

CREATE POLICY "Super admins can insert admin_users" ON public.admin_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

CREATE POLICY "Super admins can update admin_users" ON public.admin_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

CREATE POLICY "Active admins can view admin_logs" ON public.admin_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.is_active = true
        )
    );

CREATE POLICY "Active admins can insert admin_logs" ON public.admin_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.is_active = true
        )
    );

CREATE POLICY "Active admins can view deploy_history" ON public.deploy_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.is_active = true
        )
    );

CREATE POLICY "Super admins can insert deploy_history" ON public.deploy_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

CREATE POLICY "Super admins can update deploy_history" ON public.deploy_history
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

-- Insert the first super admin user
INSERT INTO public.admin_users (email, name, role, is_active) 
VALUES ('miqueiasbrandaogyn@gmail.com', 'Miqueias Brandão', 'super_admin', true);