-- Reestruturação completa do sistema de parcelas
-- Cada parcela será uma entrada separada, facilitando o pagamento mês a mês

-- 1. Criar nova tabela para agrupar compras parceladas
CREATE TABLE IF NOT EXISTS card_purchase_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    total_installments INTEGER NOT NULL CHECK (total_installments >= 1),
    category_id UUID REFERENCES categories(id),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar referência ao grupo na tabela de compras
ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS purchase_group_id UUID REFERENCES card_purchase_groups(id) ON DELETE CASCADE;

-- 3. Adicionar campo para identificar número da parcela
ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1;

-- 4. Primeiro, remover views que dependem das colunas antigas
DROP VIEW IF EXISTS card_purchases_with_details;

-- 5. Remover campos antigos que não fazem mais sentido
ALTER TABLE card_purchases DROP COLUMN IF EXISTS installments;
ALTER TABLE card_purchases DROP COLUMN IF EXISTS current_installment;

-- 6. Nova view para mostrar faturas por mês/ano
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
    -- Calcular data de vencimento da fatura
    DATE(CONCAT(cp.invoice_year, '-', LPAD(cp.invoice_month::TEXT, 2, '0'), '-', LPAD(c.due_day::TEXT, 2, '0'))) as due_date
FROM cards c
LEFT JOIN card_purchases cp ON c.id = cp.card_id
WHERE c.is_active = true
GROUP BY c.id, c.user_id, c.nickname, c.due_day, cp.invoice_month, cp.invoice_year
HAVING COUNT(*) > 0
ORDER BY cp.invoice_year DESC, cp.invoice_month DESC;

-- 7. View para mostrar compras com informações do grupo (para parcelas)
CREATE OR REPLACE VIEW card_purchases_detailed AS
SELECT 
    cp.*,
    c.nickname as card_nickname,
    c.due_day,
    cat.name as category_name,
    cat.color as category_color,
    -- Informações do grupo (se for parcelado)
    cpg.description as group_description,
    cpg.total_amount as group_total_amount,
    cpg.total_installments,
    cpg.purchase_date as group_purchase_date,
    -- Calcular informações da parcela
    CASE 
        WHEN cpg.id IS NOT NULL THEN 
            CONCAT(cp.installment_number, '/', cpg.total_installments, 'x - ', cpg.description)
        ELSE cp.description 
    END as display_description,
    -- Status da parcela
    CASE 
        WHEN cpg.id IS NOT NULL THEN true 
        ELSE false 
    END as is_installment
FROM card_purchases cp
JOIN cards c ON cp.card_id = c.id
LEFT JOIN categories cat ON cp.category_id = cat.id
LEFT JOIN card_purchase_groups cpg ON cp.purchase_group_id = cpg.id;

-- 8. Atualizar a view principal de resumo dos cartões
DROP VIEW IF EXISTS card_spending_summary;
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
    -- Valor pendente da fatura atual (mês/ano atual)
    COALESCE(
        (SELECT SUM(cp.amount) 
         FROM card_purchases cp 
         WHERE cp.card_id = c.id 
         AND cp.is_paid = false
         AND (
             (cp.invoice_month = EXTRACT(MONTH FROM CURRENT_DATE) AND cp.invoice_year = EXTRACT(YEAR FROM CURRENT_DATE))
             OR 
             (cp.invoice_month < EXTRACT(MONTH FROM CURRENT_DATE) AND cp.invoice_year = EXTRACT(YEAR FROM CURRENT_DATE))
             OR 
             (cp.invoice_year < EXTRACT(YEAR FROM CURRENT_DATE))
         )), 0
    ) as pending_amount,
    -- Total gasto no cartão (todas as compras)
    COALESCE(
        (SELECT SUM(cp.amount) 
         FROM card_purchases cp 
         WHERE cp.card_id = c.id 
         AND cp.amount > 0), 0
    ) as total_spent,
    -- Número de compras pendentes
    COALESCE(
        (SELECT COUNT(*) 
         FROM card_purchases cp 
         WHERE cp.card_id = c.id 
         AND cp.is_paid = false
         AND (
             (cp.invoice_month = EXTRACT(MONTH FROM CURRENT_DATE) AND cp.invoice_year = EXTRACT(YEAR FROM CURRENT_DATE))
             OR 
             (cp.invoice_month < EXTRACT(MONTH FROM CURRENT_DATE) AND cp.invoice_year = EXTRACT(YEAR FROM CURRENT_DATE))
             OR 
             (cp.invoice_year < EXTRACT(YEAR FROM CURRENT_DATE))
         )), 0
    ) as pending_purchases
FROM cards c
WHERE c.is_active = true;

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_card_purchase_groups_card_id ON card_purchase_groups(card_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_group_id ON card_purchases(purchase_group_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_invoice_date ON card_purchases(card_id, invoice_year, invoice_month);
CREATE INDEX IF NOT EXISTS idx_card_purchases_installment ON card_purchases(purchase_group_id, installment_number);

-- 10. RLS para as novas tabelas
ALTER TABLE card_purchase_groups ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para card_purchase_groups
DROP POLICY IF EXISTS "Users can view their card purchase groups" ON card_purchase_groups;
CREATE POLICY "Users can view their card purchase groups" ON card_purchase_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchase_groups.card_id 
            AND cards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their card purchase groups" ON card_purchase_groups;
CREATE POLICY "Users can insert their card purchase groups" ON card_purchase_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchase_groups.card_id 
            AND cards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their card purchase groups" ON card_purchase_groups;
CREATE POLICY "Users can update their card purchase groups" ON card_purchase_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchase_groups.card_id 
            AND cards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their card purchase groups" ON card_purchase_groups;
CREATE POLICY "Users can delete their card purchase groups" ON card_purchase_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchase_groups.card_id 
            AND cards.user_id = auth.uid()
        )
    );

-- 11. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_card_purchase_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_card_purchase_groups_updated_at ON card_purchase_groups;
CREATE TRIGGER trigger_card_purchase_groups_updated_at
    BEFORE UPDATE ON card_purchase_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_card_purchase_groups_updated_at();