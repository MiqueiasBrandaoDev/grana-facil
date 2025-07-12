-- Temporariamente desabilitar RLS para desenvolvimento
-- Facilita testes sem problemas de autenticação

-- Desabilitar RLS nas tabelas principais para permitir acesso anônimo
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- Dar permissões de leitura/escrita para role anônimo (desenvolvimento)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO anon;

-- Permitir acesso às views
GRANT SELECT ON public.monthly_summary TO anon;
GRANT SELECT ON public.category_summary TO anon;
GRANT SELECT ON public.transactions_with_category TO anon;
GRANT SELECT ON public.goal_progress TO anon;
GRANT SELECT ON public.upcoming_bills TO anon;

-- Permitir execução de funções para anônimos
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_spending_by_category(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.update_goal_progress(UUID, DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION public.process_whatsapp_transaction(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_default_categories(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.create_recurring_bills() TO anon;

-- Nota: Em produção, reabilitar RLS e configurar políticas adequadas
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- etc...