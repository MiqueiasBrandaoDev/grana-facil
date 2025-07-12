-- Insert default categories for new users
-- This will be used as a template when users register

-- Function to create default categories for a user
CREATE OR REPLACE FUNCTION public.create_default_categories(user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Default expense categories
    INSERT INTO public.categories (user_id, name, type, budget, color, icon) VALUES
    (user_id, 'Alimentação', 'expense', 1500.00, '#ef4444', '🍽️'),
    (user_id, 'Transporte', 'expense', 800.00, '#3b82f6', '🚗'),
    (user_id, 'Saúde', 'expense', 600.00, '#10b981', '🏥'),
    (user_id, 'Entretenimento', 'expense', 500.00, '#8b5cf6', '🎬'),
    (user_id, 'Educação', 'expense', 400.00, '#eab308', '📚'),
    (user_id, 'Roupas', 'expense', 300.00, '#f59e0b', '👔'),
    (user_id, 'Casa', 'expense', 1200.00, '#6b7280', '🏠'),
    (user_id, 'Telefone', 'expense', 150.00, '#06b6d4', '📱'),
    (user_id, 'Internet', 'expense', 100.00, '#0ea5e9', '🌐'),
    (user_id, 'Combustível', 'expense', 400.00, '#dc2626', '⛽'),
    (user_id, 'Supermercado', 'expense', 800.00, '#16a34a', '🛒'),
    (user_id, 'Farmácia', 'expense', 200.00, '#059669', '💊'),
    (user_id, 'Academia', 'expense', 120.00, '#7c3aed', '🏋️'),
    (user_id, 'Pets', 'expense', 150.00, '#d97706', '🐕'),
    (user_id, 'Viagem', 'expense', 500.00, '#0891b2', '✈️'),
    (user_id, 'Doações', 'expense', 100.00, '#be185d', '💝'),
    (user_id, 'Impostos', 'expense', 300.00, '#7c2d12', '📋'),
    (user_id, 'Seguros', 'expense', 250.00, '#374151', '🛡️'),
    (user_id, 'Empréstimos', 'expense', 0.00, '#991b1b', '💳'),
    (user_id, 'Outros', 'expense', 200.00, '#6b7280', '📦');

    -- Default income categories
    INSERT INTO public.categories (user_id, name, type, budget, color, icon) VALUES
    (user_id, 'Salário', 'income', 0.00, '#10b981', '💰'),
    (user_id, 'Freelance', 'income', 0.00, '#06b6d4', '💻'),
    (user_id, 'Vendas', 'income', 0.00, '#8b5cf6', '🛍️'),
    (user_id, 'Investimentos', 'income', 0.00, '#059669', '📈'),
    (user_id, 'Aluguel', 'income', 0.00, '#0891b2', '🏠'),
    (user_id, 'Prêmios', 'income', 0.00, '#eab308', '🏆'),
    (user_id, 'Restituição', 'income', 0.00, '#16a34a', '💸'),
    (user_id, 'Outros', 'income', 0.00, '#6b7280', '📦');
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user profile
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    -- Create default categories for the new user
    PERFORM public.create_default_categories(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();