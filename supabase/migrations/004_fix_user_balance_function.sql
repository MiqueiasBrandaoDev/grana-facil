-- Dropar funções existentes primeiro
DROP FUNCTION IF EXISTS public.get_user_balance(UUID);
DROP FUNCTION IF EXISTS public.get_monthly_spending_by_category(UUID, DATE);
DROP FUNCTION IF EXISTS public.get_monthly_spending_by_category(UUID);

-- Recriar função get_user_balance corrigida
CREATE OR REPLACE FUNCTION public.get_user_balance(input_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    balance DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN t.type = 'income' THEN t.amount
            ELSE -ABS(t.amount)  -- Garantir que despesas sejam negativas
        END
    ), 0) INTO balance
    FROM public.transactions t
    WHERE t.user_id = input_user_id AND t.status = 'completed';
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Recriar função get_monthly_spending_by_category corrigida
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
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', month_date)
    WHERE c.user_id = input_user_id AND c.type = 'expense'
    GROUP BY c.id, c.name, c.color, c.icon, c.budget
    ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Criar usuário de teste no banco para evitar problemas de autenticação
-- Só será executado se o usuário não existir
DO $$
DECLARE
    test_user_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Verificar se o usuário de teste já existe
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = test_user_uuid) THEN
        -- Inserir usuário de teste
        INSERT INTO public.users (id, email, full_name, created_at, updated_at)
        VALUES (
            test_user_uuid,
            'usuario@teste.com',
            'Usuário Teste',
            TIMEZONE('utc'::text, NOW()),
            TIMEZONE('utc'::text, NOW())
        );
        
        -- Criar categorias padrão para o usuário de teste
        PERFORM public.create_default_categories(test_user_uuid);
    END IF;
END $$;

-- Recriar permissões
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_spending_by_category(UUID, DATE) TO authenticated;

-- Também permitir acesso anônimo para desenvolvimento
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_spending_by_category(UUID, DATE) TO anon;