-- Create useful views and functions for the application

-- View for monthly transaction summary
CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT 
    t.user_id,
    DATE_TRUNC('month', t.transaction_date) as month,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_income,
    COUNT(*) as transaction_count
FROM public.transactions t
WHERE t.status = 'completed'
GROUP BY t.user_id, DATE_TRUNC('month', t.transaction_date);

-- View for category spending summary
CREATE OR REPLACE VIEW public.category_summary AS
SELECT 
    c.user_id,
    c.id as category_id,
    c.name as category_name,
    c.type as category_type,
    c.budget,
    c.color,
    c.icon,
    COALESCE(SUM(t.amount), 0) as total_spent,
    COALESCE(COUNT(t.id), 0) as transaction_count,
    CASE 
        WHEN c.budget > 0 THEN (COALESCE(SUM(t.amount), 0) / c.budget) * 100
        ELSE 0 
    END as budget_percentage
FROM public.categories c
LEFT JOIN public.transactions t ON c.id = t.category_id 
    AND t.status = 'completed'
    AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY c.user_id, c.id, c.name, c.type, c.budget, c.color, c.icon;

-- View for recent transactions with category info
CREATE OR REPLACE VIEW public.transactions_with_category AS
SELECT 
    t.id,
    t.user_id,
    t.description,
    t.amount,
    t.type,
    t.payment_method,
    t.status,
    t.transaction_date,
    t.created_at,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id;

-- View for goal progress
CREATE OR REPLACE VIEW public.goal_progress AS
SELECT 
    g.id,
    g.user_id,
    g.title,
    g.description,
    g.target_amount,
    g.current_amount,
    g.target_date,
    g.status,
    g.created_at,
    CASE 
        WHEN g.target_amount > 0 THEN (g.current_amount / g.target_amount) * 100
        ELSE 0 
    END as progress_percentage,
    CASE 
        WHEN g.target_date IS NOT NULL THEN g.target_date - CURRENT_DATE
        ELSE NULL 
    END as days_remaining
FROM public.goals g;

-- View for upcoming bills
CREATE OR REPLACE VIEW public.upcoming_bills AS
SELECT 
    b.id,
    b.user_id,
    b.title,
    b.description,
    b.amount,
    b.type,
    b.due_date,
    b.status,
    b.is_recurring,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    CASE 
        WHEN b.due_date < CURRENT_DATE AND b.status = 'pending' THEN 'overdue'
        WHEN b.due_date = CURRENT_DATE AND b.status = 'pending' THEN 'due_today'
        WHEN b.due_date <= CURRENT_DATE + INTERVAL '7 days' AND b.status = 'pending' THEN 'due_soon'
        ELSE 'future'
    END as urgency
FROM public.bills b
LEFT JOIN public.categories c ON b.category_id = c.id
WHERE b.status != 'cancelled'
ORDER BY b.due_date ASC;

-- Function to get user's current balance
CREATE OR REPLACE FUNCTION public.get_user_balance(user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    balance DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN type = 'income' THEN amount
            ELSE -amount
        END
    ), 0) INTO balance
    FROM public.transactions
    WHERE user_id = user_id AND status = 'completed';
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly spending by category
CREATE OR REPLACE FUNCTION public.get_monthly_spending_by_category(
    user_id UUID,
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
        COALESCE(SUM(t.amount), 0) as total_spent,
        c.budget,
        CASE 
            WHEN c.budget > 0 THEN (COALESCE(SUM(t.amount), 0) / c.budget) * 100
            ELSE 0 
        END as percentage
    FROM public.categories c
    LEFT JOIN public.transactions t ON c.id = t.category_id 
        AND t.user_id = user_id
        AND t.status = 'completed'
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', month_date)
    WHERE c.user_id = user_id AND c.type = 'expense'
    GROUP BY c.id, c.name, c.color, c.icon, c.budget
    ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION public.update_goal_progress(
    goal_id UUID,
    amount DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.goals
    SET 
        current_amount = current_amount + amount,
        updated_at = TIMEZONE('utc'::text, NOW()),
        status = CASE 
            WHEN current_amount + amount >= target_amount THEN 'completed'
            ELSE status
        END
    WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create recurring bills
CREATE OR REPLACE FUNCTION public.create_recurring_bills()
RETURNS VOID AS $$
DECLARE
    bill_record RECORD;
    next_due_date DATE;
BEGIN
    -- Process all recurring bills that are due
    FOR bill_record IN 
        SELECT * FROM public.bills 
        WHERE is_recurring = TRUE 
        AND status = 'paid'
        AND due_date <= CURRENT_DATE
    LOOP
        -- Calculate next due date based on interval
        CASE bill_record.recurring_interval
            WHEN 'daily' THEN
                next_due_date := bill_record.due_date + INTERVAL '1 day';
            WHEN 'weekly' THEN
                next_due_date := bill_record.due_date + INTERVAL '1 week';
            WHEN 'monthly' THEN
                next_due_date := bill_record.due_date + INTERVAL '1 month';
            WHEN 'yearly' THEN
                next_due_date := bill_record.due_date + INTERVAL '1 year';
            ELSE
                next_due_date := bill_record.due_date + INTERVAL '1 month';
        END CASE;

        -- Create new bill instance
        INSERT INTO public.bills (
            user_id, category_id, title, description, amount, type,
            due_date, status, is_recurring, recurring_interval, recurring_day
        ) VALUES (
            bill_record.user_id, bill_record.category_id, bill_record.title,
            bill_record.description, bill_record.amount, bill_record.type,
            next_due_date, 'pending', TRUE, bill_record.recurring_interval,
            bill_record.recurring_day
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process WhatsApp message and extract transaction
-- Note: This function now creates transaction without category
-- The AI categorization will be handled by the frontend
CREATE OR REPLACE FUNCTION public.process_whatsapp_transaction(
    user_id UUID,
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
    -- Extract amount from message (supports R$ 123.45, R$ 123,45, etc.)
    amount_match := (regexp_match(message_text, 'R\$\s*(\d+(?:[,\.]\d{2})?)', 'i'))[1];
    
    IF amount_match IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Convert amount to decimal
    extracted_amount := CAST(replace(amount_match, ',', '.') AS DECIMAL(10,2));
    
    -- Determine transaction type based on keywords
    IF message_text ~* '\b(gastei|paguei|comprei|despesa)\b' THEN
        transaction_type := 'expense';
        extracted_amount := -ABS(extracted_amount); -- Ensure negative for expenses
    ELSIF message_text ~* '\b(recebi|ganhei|renda|receita)\b' THEN
        transaction_type := 'income';
        extracted_amount := ABS(extracted_amount); -- Ensure positive for income
    ELSE
        -- Default to expense if can't determine
        transaction_type := 'expense';
        extracted_amount := -ABS(extracted_amount);
    END IF;
    
    -- Clean description by removing the amount
    clean_description := regexp_replace(message_text, 'R\$\s*\d+(?:[,\.]\d{2})?', '', 'gi');
    clean_description := trim(clean_description);
    
    -- If description is empty after cleaning, use default
    IF clean_description = '' THEN
        clean_description := 'Transação via WhatsApp';
    END IF;
    
    -- Create transaction without category (will be set by AI)
    INSERT INTO public.transactions (
        user_id, category_id, description, amount, type, payment_method, status
    ) VALUES (
        user_id, NULL, clean_description, extracted_amount, transaction_type, 'whatsapp', 'pending'
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for views and functions
GRANT SELECT ON public.monthly_summary TO authenticated;
GRANT SELECT ON public.category_summary TO authenticated;
GRANT SELECT ON public.transactions_with_category TO authenticated;
GRANT SELECT ON public.goal_progress TO authenticated;
GRANT SELECT ON public.upcoming_bills TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_spending_by_category(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_goal_progress(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_whatsapp_transaction(UUID, TEXT) TO authenticated;