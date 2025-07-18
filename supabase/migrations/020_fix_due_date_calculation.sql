-- Corrigir a função de cálculo da data de vencimento
-- O erro acontece quando tenta criar datas inválidas como 31 de fevereiro

DROP VIEW IF EXISTS card_monthly_invoices CASCADE;

CREATE OR REPLACE VIEW card_monthly_invoices AS
SELECT 
    c.id as card_id,
    c.user_id,
    c.nickname as card_nickname,
    c.due_day,
    cp.invoice_month,
    cp.invoice_year,
    COALESCE(SUM(CASE WHEN cp.is_paid = false THEN cp.amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(cp.amount), 0) as total_amount,
    COUNT(CASE WHEN cp.is_paid = false THEN 1 END) as pending_purchases,
    COUNT(*) as total_purchases,
    -- Calcular data de vencimento da fatura de forma segura
    CASE 
        -- Fevereiro: máximo dia 28
        WHEN cp.invoice_month = 2 AND c.due_day > 28 THEN 
            DATE(cp.invoice_year || '-02-28')
        -- Meses com 30 dias (abril, junho, setembro, novembro)
        WHEN cp.invoice_month IN (4, 6, 9, 11) AND c.due_day > 30 THEN 
            DATE(cp.invoice_year || '-' || LPAD(cp.invoice_month::TEXT, 2, '0') || '-30')
        -- Casos normais
        ELSE 
            DATE(cp.invoice_year || '-' || LPAD(cp.invoice_month::TEXT, 2, '0') || '-' || LPAD(LEAST(c.due_day, 31)::TEXT, 2, '0'))
    END as due_date
FROM cards c
LEFT JOIN card_purchases cp ON c.id = cp.card_id
WHERE c.is_active = true
GROUP BY c.id, c.user_id, c.nickname, c.due_day, cp.invoice_month, cp.invoice_year
HAVING COUNT(*) > 0
ORDER BY cp.invoice_year DESC, cp.invoice_month DESC;