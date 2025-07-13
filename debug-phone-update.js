/**
 * 🔍 SCRIPT DE DEBUG PARA ATUALIZAÇÃO DE TELEFONE
 * Execute no console do navegador na página Settings
 */

// Função para testar atualização de telefone
async function testPhoneUpdate(userId, phoneNumber, fullName) {
  const SUPABASE_URL = 'https://ckecbglrlqarlbnncwcs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZWNiZ2xybHFhcmxibm5jd2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjk2ODEsImV4cCI6MjA2NzY0NTY4MX0.IbmNmBo-QoMbSNoBIiRHb3LYhy0BEtv_vMCY-5SSEls';

  console.log('🔍 Testando atualização de telefone...');
  console.log('User ID:', userId);
  console.log('Phone:', phoneNumber);
  console.log('Name:', fullName);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        phone: phoneNumber,
        full_name: fullName,
        updated_at: new Date().toISOString()
      })
    });

    console.log('Status:', response.status);
    console.log('OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Sucesso:', data);
    return true;

  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return false;
  }
}

// Função para verificar se campo phone existe
async function checkPhoneField() {
  const SUPABASE_URL = 'https://ckecbglrlqarlbnncwcs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZWNiZ2xybHFhcmxibm5jd2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjk2ODEsImV4cCI6MjA2NzY0NTY4MX0.IbmNmBo-QoMbSNoBIiRHb3LYhy0BEtv_vMCY-5SSEls';

  console.log('🔍 Verificando se campo phone existe...');

  try {
    // Tentar buscar usuários com phone
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email,full_name,phone&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      
      if (errorText.includes('column "phone" does not exist')) {
        console.error('🚨 CAMPO PHONE NÃO EXISTE! Execute a migration.');
        return false;
      }
    }

    const data = await response.json();
    console.log('✅ Campo phone existe. Dados:', data);
    return true;

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return false;
  }
}

// Função para obter usuário atual
function getCurrentUser() {
  if (typeof supabase !== 'undefined') {
    return supabase.auth.getUser();
  } else {
    console.error('❌ Supabase não encontrado');
    return null;
  }
}

console.log('🔧 DEBUG PHONE UPDATE CARREGADO');
console.log('📋 Comandos disponíveis:');
console.log('- checkPhoneField() - Verificar se campo phone existe');
console.log('- testPhoneUpdate(userId, phone, name) - Testar atualização');
console.log('- getCurrentUser() - Obter usuário atual');

// Auto-executar verificação
checkPhoneField();