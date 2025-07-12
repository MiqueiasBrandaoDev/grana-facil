-- ===================================================================
-- MIGRATION 007: CORREÇÃO DEFINITIVA DO PROBLEMA DE AUTH
-- Remove a dependência do auth.users para desenvolvimento
-- ===================================================================

-- 1. REMOVER CONSTRAINT DE FOREIGN KEY TEMPORARIAMENTE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. DROPAR FUNÇÕES EXISTENTES
DROP FUNCTION IF EXISTS public.get_user_balance(UUID);
DROP FUNCTION IF EXISTS public.get_monthly_spending_by_category(UUID, DATE);
DROP FUNCTION IF EXISTS public.get_monthly_spending_by_category(UUID);
DROP FUNCTION IF EXISTS public.process_whatsapp_transaction(UUID, TEXT);

-- 3. LIMPAR DADOS EXISTENTES DE TESTE (se houver)
DELETE FROM public.whatsapp_messages WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.transactions WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.categories WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- 4. CRIAR USUÁRIO DE TESTE (sem restrição de auth)
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'usuario@teste.com',
    'Usuário Teste',
    TIMEZONE('utc'::text, NOW()),
    TIMEZONE('utc'::text, NOW())
);

-- 5. CRIAR CATEGORIAS PADRÃO
PERFORM public.create_default_categories('00000000-0000-0000-0000-000000000001');

-- 6. RECRIAR FUNÇÕES CORRIGIDAS
CREATE OR REPLACE FUNCTION public.get_user_balance(input_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    balance DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -ABS(t.amount)
            ELSE 0
        END
    ), 0) INTO balance
    FROM public.transactions t
    WHERE t.user_id = input_user_id AND t.status = 'completed';
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_monthly_spending_by_category(
    input_user_id UUID,
    month_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    category_name TEXT,
    category_color TEXT,
    category_icon TEXT,
    total_spent DECIMAL(10,2),
    budget DECIMAL(10,2),
    percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name,
        c.color,
        c.icon,
        COALESCE(SUM(ABS(t.amount)), 0) as total_spent,
        c.budget,
        CASE 
            WHEN c.budget > 0 THEN (COALESCE(SUM(ABS(t.amount)), 0) / c.budget) * 100
            ELSE 0 
        END as percentage
    FROM public.categories c
    LEFT JOIN public.transactions t ON c.id = t.category_id 
        AND t.user_id = input_user_id
        AND t.status = 'completed'
        AND t.type = 'expense'
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', month_date)
    WHERE c.user_id = input_user_id AND c.type = 'expense'
    GROUP BY c.id, c.name, c.color, c.icon, c.budget
    ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.process_whatsapp_transaction(
    input_user_id UUID,
    message_text TEXT
)
RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    amount_match TEXT;
    extracted_amount DECIMAL(10,2);
    transaction_type TEXT;
    clean_description TEXT;
BEGIN
    -- Extrair valor da mensagem
    amount_match := (regexp_match(message_text, 'R\$\s*(\d+(?:[,\.]\d{2})?)', 'i'))[1];
    
    IF amount_match IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Converter para decimal
    extracted_amount := CAST(replace(amount_match, ',', '.') AS DECIMAL(10,2));
    
    -- Determinar tipo da transação
    IF message_text ~* '\b(gastei|paguei|comprei|despesa)\b' THEN
        transaction_type := 'expense';
        extracted_amount := ABS(extracted_amount);
    ELSIF message_text ~* '\b(recebi|ganhei|renda|receita|salário)\b' THEN
        transaction_type := 'income';
        extracted_amount := ABS(extracted_amount);
    ELSE
        transaction_type := 'expense';
        extracted_amount := ABS(extracted_amount);
    END IF;
    
    -- Limpar descrição
    clean_description := regexp_replace(message_text, 'R\$\s*\d+(?:[,\.]\d{2})?', '', 'gi');
    clean_description := trim(clean_description);
    
    IF clean_description = '' THEN
        clean_description := 'Transação via WhatsApp';
    END IF;
    
    -- Criar transação
    INSERT INTO public.transactions (
        user_id, category_id, description, amount, type, payment_method, status
    ) VALUES (
        input_user_id, NULL, clean_description, extracted_amount, transaction_type, 'whatsapp', 'pending'
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 7. DESABILITAR RLS PARA DESENVOLVIMENTO
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- 8. CONFIGURAR PERMISSÕES COMPLETAS
-- Permissões para anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO anon;

-- Permissões para views
GRANT SELECT ON public.monthly_summary TO anon;
GRANT SELECT ON public.category_summary TO anon;
GRANT SELECT ON public.transactions_with_category TO anon;
GRANT SELECT ON public.goal_progress TO anon;
GRANT SELECT ON public.upcoming_bills TO anon;

-- Permissões para funções
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_spending_by_category(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.update_goal_progress(UUID, DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION public.process_whatsapp_transaction(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_default_categories(UUID) TO anon;

-- Permissões para authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;

GRANT SELECT ON public.monthly_summary TO authenticated;
GRANT SELECT ON public.category_summary TO authenticated;
GRANT SELECT ON public.transactions_with_category TO authenticated;
GRANT SELECT ON public.goal_progress TO authenticated;
GRANT SELECT ON public.upcoming_bills TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_spending_by_category(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_goal_progress(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_whatsapp_transaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_categories(UUID) TO authenticated;

-- 9. INSERIR TRANSAÇÕES DE TESTE
DO $$
DECLARE
    test_user_uuid UUID := '00000000-0000-0000-0000-000000000001';
    alimentacao_id UUID;
    salario_id UUID;
BEGIN
    -- Buscar categorias
    SELECT id INTO alimentacao_id FROM public.categories 
    WHERE user_id = test_user_uuid AND name = 'Alimentação' AND type = 'expense'
    LIMIT 1;
    
    SELECT id INTO salario_id FROM public.categories 
    WHERE user_id = test_user_uuid AND name = 'Salário' AND type = 'income'
    LIMIT 1;
    
    -- Inserir transações de exemplo
    IF alimentacao_id IS NOT NULL AND salario_id IS NOT NULL THEN
        INSERT INTO public.transactions (user_id, category_id, description, amount, type, payment_method, status)
        VALUES 
            (test_user_uuid, alimentacao_id, 'Compras no supermercado', 150.00, 'expense', 'cartão', 'completed'),
            (test_user_uuid, salario_id, 'Salário do mês', 5000.00, 'income', 'transferência', 'completed');
    END IF;
END $$;

-- 10. VERIFICAÇÃO FINAL
DO $$
DECLARE
    test_user_uuid UUID := '00000000-0000-0000-0000-000000000001';
    user_exists BOOLEAN;
    category_count INTEGER;
    transaction_count INTEGER;
    current_balance DECIMAL(10,2);
BEGIN
    -- Verificações
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = test_user_uuid) INTO user_exists;
    SELECT COUNT(*) INTO category_count FROM public.categories WHERE user_id = test_user_uuid;
    SELECT COUNT(*) INTO transaction_count FROM public.transactions WHERE user_id = test_user_uuid;
    SELECT public.get_user_balance(test_user_uuid) INTO current_balance;
    
    -- Log de verificação
    RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
    RAISE NOTICE 'Usuário criado: %', user_exists;
    RAISE NOTICE 'Categorias criadas: %', category_count;
    RAISE NOTICE 'Transações criadas: %', transaction_count;
    RAISE NOTICE 'Saldo atual: R$ %', current_balance;
    RAISE NOTICE 'UUID do usuário: %', test_user_uuid;
    
    IF user_exists AND category_count > 0 THEN
        RAISE NOTICE 'SUCESSO: Sistema pronto para usar!';
    ELSE
        RAISE NOTICE 'ERRO: Algo deu errado na configuração!';
    END IF;
END $$;