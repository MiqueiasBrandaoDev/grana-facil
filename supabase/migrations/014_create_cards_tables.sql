-- Criar tabela de cartões
CREATE TABLE IF NOT EXISTS cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    limit_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    current_invoice_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de compras no cartão
CREATE TABLE IF NOT EXISTS card_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES categories(id),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    installments INTEGER DEFAULT 1 CHECK (installments >= 1),
    current_installment INTEGER DEFAULT 1,
    invoice_month INTEGER NOT NULL,
    invoice_year INTEGER NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    transaction_id UUID REFERENCES transactions(id), -- Referência para quando vira transação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_active ON cards(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_card_purchases_card_id ON card_purchases(card_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_invoice ON card_purchases(card_id, invoice_month, invoice_year);
CREATE INDEX IF NOT EXISTS idx_card_purchases_unpaid ON card_purchases(card_id, is_paid);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_card_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_cards_updated_at ON cards;
CREATE TRIGGER trigger_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_cards_updated_at();

DROP TRIGGER IF EXISTS trigger_card_purchases_updated_at ON card_purchases;
CREATE TRIGGER trigger_card_purchases_updated_at
    BEFORE UPDATE ON card_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_card_purchases_updated_at();

-- Função para calcular mês/ano da fatura baseado na data de compra e dia de vencimento
CREATE OR REPLACE FUNCTION calculate_invoice_period(
    purchase_date DATE,
    due_day INTEGER
) RETURNS TABLE(invoice_month INTEGER, invoice_year INTEGER) AS $$
DECLARE
    purchase_day INTEGER;
    current_month INTEGER;
    current_year INTEGER;
BEGIN
    purchase_day := EXTRACT(DAY FROM purchase_date);
    current_month := EXTRACT(MONTH FROM purchase_date);
    current_year := EXTRACT(YEAR FROM purchase_date);
    
    -- Se a compra foi feita depois do dia de vencimento, a fatura é do próximo mês
    IF purchase_day > due_day THEN
        IF current_month = 12 THEN
            invoice_month := 1;
            invoice_year := current_year + 1;
        ELSE
            invoice_month := current_month + 1;
            invoice_year := current_year;
        END IF;
    ELSE
        invoice_month := current_month;
        invoice_year := current_year;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- View para listar compras com informações do cartão
CREATE OR REPLACE VIEW card_purchases_with_details AS
SELECT 
    cp.*,
    c.nickname as card_nickname,
    c.due_day,
    cat.name as category_name,
    cat.color as category_color
FROM card_purchases cp
JOIN cards c ON cp.card_id = c.id
LEFT JOIN categories cat ON cp.category_id = cat.id;

-- View para resumo de gastos por cartão
CREATE OR REPLACE VIEW card_spending_summary AS
SELECT 
    c.id,
    c.nickname,
    c.due_day,
    c.limit_amount,
    c.current_invoice_paid,
    c.created_at,
    COALESCE(SUM(CASE WHEN cp.is_paid = false THEN cp.amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(cp.amount), 0) as total_spent,
    COUNT(CASE WHEN cp.is_paid = false THEN 1 END) as pending_purchases
FROM cards c
LEFT JOIN card_purchases cp ON c.id = cp.card_id
WHERE c.is_active = true
GROUP BY c.id, c.nickname, c.due_day, c.limit_amount, c.current_invoice_paid, c.created_at;

-- RLS (Row Level Security)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_purchases ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cards
DROP POLICY IF EXISTS "Users can view their own cards" ON cards;
CREATE POLICY "Users can view their own cards" ON cards
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own cards" ON cards;
CREATE POLICY "Users can insert their own cards" ON cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cards" ON cards;
CREATE POLICY "Users can update their own cards" ON cards
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cards" ON cards;
CREATE POLICY "Users can delete their own cards" ON cards
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para card_purchases
DROP POLICY IF EXISTS "Users can view purchases from their cards" ON card_purchases;
CREATE POLICY "Users can view purchases from their cards" ON card_purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchases.card_id 
            AND cards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert purchases in their cards" ON card_purchases;
CREATE POLICY "Users can insert purchases in their cards" ON card_purchases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchases.card_id 
            AND cards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update purchases from their cards" ON card_purchases;
CREATE POLICY "Users can update purchases from their cards" ON card_purchases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchases.card_id 
            AND cards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete purchases from their cards" ON card_purchases;
CREATE POLICY "Users can delete purchases from their cards" ON card_purchases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cards 
            WHERE cards.id = card_purchases.card_id 
            AND cards.user_id = auth.uid()
        )
    );