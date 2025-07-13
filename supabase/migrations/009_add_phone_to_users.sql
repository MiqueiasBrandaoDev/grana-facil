-- 📱 ADICIONAR CAMPO PHONE À TABELA USERS
-- Para suporte completo ao WhatsApp

-- Adicionar coluna phone
ALTER TABLE public.users 
ADD COLUMN phone TEXT;

-- Índice único para phone (permitindo NULL)
CREATE UNIQUE INDEX idx_users_phone 
ON public.users(phone) 
WHERE phone IS NOT NULL;

-- Comentário
COMMENT ON COLUMN public.users.phone IS 'Número de telefone do usuário para WhatsApp (formato: 5511999999999)';

-- Atualizar função de trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;