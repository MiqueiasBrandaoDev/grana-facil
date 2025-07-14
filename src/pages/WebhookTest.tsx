/**
 * 🧪 PÁGINA DE TESTE DO WEBHOOK EVOLUTION API
 * Interface para testar e monitorar webhooks
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Phone, MessageSquare, Settings, RefreshCw } from 'lucide-react';
import { getWebhookStatus } from '@/api/webhook';
import { createEvolutionWebhookService } from '@/lib/evolution-webhook';

const WebhookTest: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [testPayload, setTestPayload] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Testando a integração da Grana IA 🤖');

  // Carregar status na inicialização
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = () => {
    try {
      const webhookStatus = getWebhookStatus();
      setStatus(webhookStatus);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const testWebhookPayload = async () => {
    if (!testPayload.trim()) return;

    setIsLoading(true);
    setTestResult('');

    try {
      const payload = JSON.parse(testPayload);
      const { handleEvolutionWebhook } = await import('@/api/webhook');
      const result = await handleEvolutionWebhook(payload);
      
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!phoneNumber.trim() || !testMessage.trim()) return;

    setIsLoading(true);
    try {
      const service = createEvolutionWebhookService();
      const success = await service.sendMessage(phoneNumber, testMessage);
      
      setTestResult(success ? 'Mensagem enviada com sucesso!' : 'Falha ao enviar mensagem');
    } catch (error) {
      setTestResult(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getExamplePayload = () => {
    return JSON.stringify({
      event: "messages.upsert",
      instance: "granaboard",
      data: {
        key: {
          remoteJid: "5511999999999@s.whatsapp.net",
          fromMe: false,
          id: "3EB0123456789"
        },
        message: {
          conversation: "Gastei 50 reais no mercado"
        },
        messageTimestamp: Date.now(),
        pushName: "Usuário Teste"
      }
    }, null, 2);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🤖 Webhook Evolution API</h1>
          <p className="text-muted-foreground">Interface de teste e monitoramento</p>
        </div>
        <Button onClick={loadStatus} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Serviço:</span>
                <Badge variant="default">{status.service}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {status.status}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Configuração:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">API URL:</span>
                    <p className="font-mono break-all">{status.environment?.apiUrl}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Instância:</span>
                    <p className="font-mono">{status.environment?.instanceName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Webhook URL:</span>
                    <p className="font-mono break-all">{status.environment?.webhookUrl || 'Aguardando URL do EasyPanel'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>
                    <p className="font-mono">{new Date(status.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Endpoints:</h4>
                <div className="space-y-1 text-sm font-mono">
                  <div>POST {status.endpoints?.webhook}</div>
                  <div>GET {status.endpoints?.status}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              Carregando status...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teste de Envio de Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Teste de Envio de Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Número (sem +55):</Label>
              <Input
                id="phone"
                placeholder="11999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="message">Mensagem:</Label>
              <Input
                id="message"
                placeholder="Teste da Grana IA"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={sendTestMessage} 
            disabled={isLoading || !phoneNumber.trim() || !testMessage.trim()}
            className="w-full"
          >
            <Phone className="w-4 h-4 mr-2" />
            {isLoading ? 'Enviando...' : 'Enviar Mensagem Teste'}
          </Button>
        </CardContent>
      </Card>

      {/* Teste de Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Teste de Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payload">Payload JSON:</Label>
            <Textarea
              id="payload"
              placeholder="Cole aqui o payload do webhook para testar..."
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={testWebhookPayload} disabled={isLoading || !testPayload.trim()}>
              {isLoading ? 'Processando...' : 'Testar Webhook'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setTestPayload(getExamplePayload())}
            >
              Usar Exemplo
            </Button>
          </div>

          {testResult && (
            <div>
              <Label>Resultado:</Label>
              <Textarea
                value={testResult}
                readOnly
                rows={6}
                className="font-mono text-sm bg-muted"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Deploy no EasyPanel:</strong>
                <p className="text-muted-foreground">Faça o deploy da aplicação e obtenha a URL pública</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>Configurar Webhook na Evolution API:</strong>
                <p className="text-muted-foreground">Configure a URL: <code>https://sua-url.easypanel.app/api/evolution/webhook</code></p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Configurar Variáveis de Ambiente:</strong>
                <p className="text-muted-foreground">VITE_EVOLUTION_API_URL, VITE_EVOLUTION_API_KEY, VITE_EVOLUTION_INSTANCE_NAME</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Testar Integração:</strong>
                <p className="text-muted-foreground">Envie mensagem de teste no WhatsApp conectado à Evolution API</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookTest;