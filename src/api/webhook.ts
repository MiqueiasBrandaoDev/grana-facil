/**
 * 🚀 WEBHOOK ENDPOINT PARA EVOLUTION API
 * Endpoint para receber webhooks da Evolution API no EasyPanel
 */

import { EvolutionWebhookService, EvolutionWebhookPayload } from '@/lib/evolution-webhook';

// Instância do serviço webhook
let webhookService: EvolutionWebhookService | null = null;

/**
 * 🔧 Inicializar serviço webhook
 */
function getWebhookService(): EvolutionWebhookService {
  if (!webhookService) {
    const config = {
      baseUrl: import.meta.env.VITE_EVOLUTION_API_URL || 'http://localhost:8080',
      apiKey: import.meta.env.VITE_EVOLUTION_API_KEY || '',
      instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'granafacil',
      webhookUrl: import.meta.env.VITE_EVOLUTION_WEBHOOK_URL || ''
    };
    
    webhookService = new EvolutionWebhookService(config);
  }
  
  return webhookService;
}

/**
 * 📨 Handler principal do webhook
 * Esta função será chamada pelo endpoint da API
 */
export async function handleEvolutionWebhook(payload: EvolutionWebhookPayload): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📱 Webhook Evolution API recebido:', {
      event: payload.event,
      instance: payload.instance,
      timestamp: new Date().toISOString()
    });

    const service = getWebhookService();
    await service.processWebhook(payload);

    return {
      success: true,
      message: 'Webhook processado com sucesso'
    };
  } catch (error) {
    console.error('❌ Erro ao processar webhook Evolution API:', error);
    
    return {
      success: false,
      message: `Erro ao processar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * 🔍 Endpoint de teste/status
 */
export function getWebhookStatus(): object {
  return {
    service: 'Evolution API Webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: {
      apiUrl: import.meta.env.VITE_EVOLUTION_API_URL || 'não configurado',
      instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'granafacil',
      webhookUrl: import.meta.env.VITE_EVOLUTION_WEBHOOK_URL || 'não configurado'
    },
    endpoints: {
      webhook: '/api/evolution/webhook',
      status: '/api/evolution/status'
    }
  };
}

export default handleEvolutionWebhook;