-- Remover constraint que impede valores negativos (para permitir pagamentos parciais)
ALTER TABLE card_purchases DROP CONSTRAINT IF EXISTS card_purchases_amount_check;

-- Corrigir a view para considerar pagamentos parciais (créditos negativos)
DROP VIEW IF EXISTS card_spending_summary;

-- Recriar a view considerando créditos de pagamentos parciais
CREATE VIEW card_spending_summary AS
SELECT 
    c.id,
    c.user_id,
    c.nickname,
    c.due_day,
    c.limit_amount,
    c.is_active,
    c.current_invoice_paid,
    c.created_at,
    c.updated_at,
    -- Soma compras não pagas + créditos de pagamentos parciais (valores negativos já pagos)
    COALESCE(
        SUM(CASE WHEN cp.is_paid = false THEN cp.amount ELSE 0 END) + 
        SUM(CASE WHEN cp.is_paid = true AND cp.amount < 0 THEN cp.amount ELSE 0 END), 
        0
    ) as pending_amount,
    COALESCE(SUM(CASE WHEN cp.amount > 0 THEN cp.amount ELSE 0 END), 0) as total_spent,
    COUNT(CASE WHEN cp.is_paid = false AND cp.amount > 0 THEN 1 END) as pending_purchases
FROM cards c
LEFT JOIN card_purchases cp ON c.id = cp.card_id
WHERE c.is_active = true
GROUP BY c.id, c.user_id, c.nickname, c.due_day, c.limit_amount, c.is_active, c.current_invoice_paid, c.created_at, c.updated_at;