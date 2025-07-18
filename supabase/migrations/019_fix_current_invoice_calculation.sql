-- Corrigir a view para mostrar apenas valor da fatura atual no card principal
-- Não incluir faturas futuras no pending_amount

DROP VIEW IF EXISTS card_spending_summary CASCADE;

CREATE OR REPLACE VIEW card_spending_summary AS
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
    -- Valor pendente APENAS da fatura atual e vencidas (NÃO futuras)
    COALESCE(
        (SELECT SUM(cp.amount) 
         FROM card_purchases cp 
         WHERE cp.card_id = c.id 
         AND cp.is_paid = false
         AND (
             -- Faturas vencidas (anos anteriores)
             (cp.invoice_year < EXTRACT(YEAR FROM CURRENT_DATE))
             OR 
             -- Fatura do ano atual até o mês atual (não meses futuros)
             (cp.invoice_year = EXTRACT(YEAR FROM CURRENT_DATE) AND cp.invoice_month <= EXTRACT(MONTH FROM CURRENT_DATE))
         )), 0
    ) as pending_amount,
    -- Total gasto no cartão (todas as compras positivas)
    COALESCE(
        (SELECT SUM(cp.amount) 
         FROM card_purchases cp 
         WHERE cp.card_id = c.id 
         AND cp.amount > 0), 0
    ) as total_spent,
    -- Número de compras pendentes APENAS da fatura atual e vencidas
    COALESCE(
        (SELECT COUNT(*) 
         FROM card_purchases cp 
         WHERE cp.card_id = c.id 
         AND cp.is_paid = false
         AND (
             -- Faturas vencidas (anos anteriores)
             (cp.invoice_year < EXTRACT(YEAR FROM CURRENT_DATE))
             OR 
             -- Fatura do ano atual até o mês atual (não meses futuros)
             (cp.invoice_year = EXTRACT(YEAR FROM CURRENT_DATE) AND cp.invoice_month <= EXTRACT(MONTH FROM CURRENT_DATE))
         )), 0
    ) as pending_purchases
FROM cards c
WHERE c.is_active = true;