import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

/**
 * Obtém o usuário atualmente autenticado
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Verificar se há usuário logado
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Erro ao verificar autenticação:', error);
      return null;
    }
    
    if (user) {
      // Buscar dados completos do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.warn('Usuário não encontrado na tabela users, usando dados do auth:', userError.message);
        
        // Se usuário não existe na tabela users, tentar criar
        try {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || ''
            }]);
          
          if (insertError) {
            console.warn('Erro ao criar usuário na tabela users:', insertError.message);
          }
        } catch (insertErr) {
          console.warn('Erro ao inserir usuário:', insertErr);
        }
      }

      return {
        id: user.id,
        email: user.email || '',
        full_name: userData?.full_name || user.user_metadata?.full_name || ''
      };
    }

    return null;
    
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
}

/**
 * Cria usuário de teste para desenvolvimento
 */
async function createTestUser(): Promise<User> {
  const testEmail = 'usuario@teste.com';
  const testPassword = 'senha123';
  
  try {
    // Tentar fazer login primeiro
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginData.user) {
      return {
        id: loginData.user.id,
        email: loginData.user.email || testEmail,
        full_name: 'Usuário Teste'
      };
    }

    // Se login falhar, criar novo usuário
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Usuário Teste'
        }
      }
    });

    if (signupError) {
      throw signupError;
    }

    if (signupData.user) {
      return {
        id: signupData.user.id,
        email: signupData.user.email || testEmail,
        full_name: 'Usuário Teste'
      };
    }

    throw new Error('Não foi possível criar usuário de teste');
    
  } catch (error) {
    console.error('Erro ao criar usuário de teste:', error);
    
    // Fallback: retornar usuário mock para desenvolvimento
    return {
      id: 'test-user-id',
      email: testEmail,
      full_name: 'Usuário Teste'
    };
  }
}

/**
 * Logout seguro - limpa todos os dados do usuário
 */
export async function logout(): Promise<void> {
  try {
    // 1. Limpar cache do React Query
    if (typeof window !== 'undefined' && window.queryClient) {
      console.log('🧹 Limpando cache do React Query...');
      window.queryClient.clear();
      window.queryClient.invalidateQueries();
    }

    // 2. Limpar localStorage do chat (específico do usuário)
    console.log('🧹 Limpando dados do localStorage...');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('grana_') || key.includes('chat_history')) {
        localStorage.removeItem(key);
      }
    });

    // 3. Limpar contexto da IA
    console.log('🧹 Limpando contexto da IA...');
    if (typeof window !== 'undefined' && window.aiAgent) {
      window.aiAgent.clearUserContext();
    }

    // 4. Fazer logout do Supabase
    console.log('🧹 Fazendo logout do Supabase...');
    await supabase.auth.signOut();
    
    console.log('✅ Logout seguro concluído');
  } catch (error) {
    console.error('❌ Erro durante logout seguro:', error);
    // Mesmo com erro, tentar fazer logout básico
    await supabase.auth.signOut();
  }
}

/**
 * Hook para verificar se usuário está autenticado
 */
export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [previousUserId, setPreviousUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (mounted) {
        setUser(currentUser);
        setLoading(false);
      }
    };

    checkUser();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          if (session?.user) {
            const newUser = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name
            };
            
            // Detectar mudança de usuário
            if (previousUserId && previousUserId !== newUser.id) {
              console.log('🔄 Mudança de usuário detectada - limpando dados...');
              
              // Limpar cache do React Query
              if (typeof window !== 'undefined' && window.queryClient) {
                window.queryClient.clear();
                window.queryClient.invalidateQueries();
              }
              
              // Limpar contexto da IA
              if (typeof window !== 'undefined' && window.aiAgent) {
                window.aiAgent.clearUserContext();
              }
            }
            
            setUser(newUser);
            setPreviousUserId(newUser.id);
          } else {
            setUser(null);
            setPreviousUserId(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [previousUserId]);

  return { user, loading };
}