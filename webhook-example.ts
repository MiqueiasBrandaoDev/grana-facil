/**
 * 🚀 EXEMPLO DE IMPLEMENTAÇÃO DO WEBHOOK WHATSAPP
 * 
 * Este arquivo mostra como implementar o endpoint do webhook
 * no seu backend (Express.js, Next.js API Routes, etc.)
 * 
 * IMPORTANTE: Este é apenas um exemplo. Adapte para sua stack!
 */

import { createWhatsAppWebhookService, WhatsAppWebhookPayload } from './src/lib/whatsapp-webhook';

// ==========================================
// EXEMPLO PARA EXPRESS.JS
// ==========================================

/*
import express from 'express';
import { createWhatsAppWebhookService } from './lib/whatsapp-webhook';

const app = express();
app.use(express.json());

const whatsappService = createWhatsAppWebhookService();

// Verificação do webhook (GET)
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = whatsappService.verifyWebhook(mode, token, challenge);
  
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Recebimento de mensagens (POST)
app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    const payload: WhatsAppWebhookPayload = req.body;
    await whatsappService.processWebhook(payload);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

app.listen(3000, () => {
  console.log('🚀 Servidor rodando na porta 3000');
  console.log('📱 Webhook WhatsApp: http://localhost:3000/api/whatsapp/webhook');
});
*/

// ==========================================
// EXEMPLO PARA NEXT.JS API ROUTES
// ==========================================

/*
// pages/api/whatsapp/webhook.ts (ou app/api/whatsapp/webhook/route.ts)

import { NextApiRequest, NextApiResponse } from 'next';
import { createWhatsAppWebhookService } from '../../../lib/whatsapp-webhook';

const whatsappService = createWhatsAppWebhookService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Verificação do webhook
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    
    const result = whatsappService.verifyWebhook(
      mode as string, 
      token as string, 
      challenge as string
    );
    
    if (result) {
      return res.status(200).send(result);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    // Processamento de mensagens
    try {
      await whatsappService.processWebhook(req.body);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro no webhook:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
*/

// ==========================================
// EXEMPLO PARA VERCEL SERVERLESS
// ==========================================

/*
// api/whatsapp/webhook.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createWhatsAppWebhookService } from '../../lib/whatsapp-webhook';

const whatsappService = createWhatsAppWebhookService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    
    const result = whatsappService.verifyWebhook(
      mode as string, 
      token as string, 
      challenge as string
    );
    
    if (result) {
      return res.status(200).send(result);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    try {
      await whatsappService.processWebhook(req.body);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro no webhook:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
*/

// ==========================================
// EXEMPLO PARA NETLIFY FUNCTIONS
// ==========================================

/*
// netlify/functions/whatsapp-webhook.ts

import { Handler } from '@netlify/functions';
import { createWhatsAppWebhookService } from '../../src/lib/whatsapp-webhook';

const whatsappService = createWhatsAppWebhookService();

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters;
    const mode = params?.['hub.mode'];
    const token = params?.['hub.verify_token'];
    const challenge = params?.['hub.challenge'];
    
    const result = whatsappService.verifyWebhook(mode!, token!, challenge!);
    
    if (result) {
      return { statusCode: 200, headers, body: result };
    } else {
      return { statusCode: 403, headers, body: 'Forbidden' };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      await whatsappService.processWebhook(payload);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (error) {
      console.error('Erro no webhook:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
*/

// ==========================================
// CONFIGURAÇÃO DAS VARIÁVEIS DE AMBIENTE
// ==========================================

/*
Adicione estas variáveis no seu .env:

VITE_WHATSAPP_ACCESS_TOKEN=your_meta_business_access_token
VITE_WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_business_phone_number_id
VITE_WHATSAPP_VERIFY_TOKEN=grana_facil_webhook_verify
VITE_WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/whatsapp/webhook

Para obter esses valores:
1. Acesse Meta for Developers (developers.facebook.com)
2. Crie um app Business
3. Adicione o produto WhatsApp Business API
4. Configure o número de telefone
5. Gere o token de acesso
6. Configure o webhook URL
*/

// ==========================================
// EXEMPLO DE TESTE LOCAL COM NGROK
// ==========================================

/*
1. Instale o ngrok: npm install -g ngrok
2. Execute seu servidor local na porta 3000
3. Execute: ngrok http 3000
4. Use a URL do ngrok como webhook URL
5. Teste enviando mensagens para o seu número WhatsApp Business

Exemplo:
- Servidor local: http://localhost:3000
- Ngrok: https://abc123.ngrok.io
- Webhook URL: https://abc123.ngrok.io/api/whatsapp/webhook
*/

export default {};