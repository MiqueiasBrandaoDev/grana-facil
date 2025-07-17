-- Dropar a view existente e recriar com a estrutura correta
DROP VIEW IF EXISTS card_spending_summary;

-- Recriar a view com todos os campos necessários na ordem correta
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
    COALESCE(SUM(CASE WHEN cp.is_paid = false THEN cp.amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(cp.amount), 0) as total_spent,
    COUNT(CASE WHEN cp.is_paid = false THEN 1 END) as pending_purchases
FROM cards c
LEFT JOIN card_purchases cp ON c.id = cp.card_id
WHERE c.is_active = true
GROUP BY c.id, c.user_id, c.nickname, c.due_day, c.limit_amount, c.is_active, c.current_invoice_paid, c.created_at, c.updated_at;