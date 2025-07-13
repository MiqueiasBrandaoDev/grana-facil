/**
 * 🔍 PÁGINA DE DEBUG DO WEBHOOK WHATSAPP
 * Para diagnosticar problemas na integração
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Phone, MessageSquare, Bug, Send, RefreshCw, Zap } from 'lucide-react';
import { createEvolutionWebhookService } from '@/lib/evolution-webhook';
import { supabase } from '@/integrations/supabase/client';

const WebhookDebug: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Testando a Grana IA 🤖');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);
  const [lastMessages, setLastMessages] = useState<any[]>([]);

  useEffect(() => {
    loadWebhookConfig();
    loadRecentMessages();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const loadWebhookConfig = () => {
    const config = {
      apiUrl: import.meta.env.VITE_EVOLUTION_API_URL || 'NÃO CONFIGURADO',
      apiKey: import.meta.env.VITE_EVOLUTION_API_KEY || 'NÃO CONFIGURADO',
      instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'NÃO CONFIGURADO',
      webhookUrl: import.meta.env.VITE_EVOLUTION_WEBHOOK_URL || 'NÃO CONFIGURADO'
    };
    setWebhookConfig(config);
    addLog('🔧 Configuração carregada');
  };

  const loadRecentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        addLog(`❌ Erro ao carregar mensagens: ${error.message}`);
        return;
      }

      setLastMessages(data || []);
      addLog(`📨 ${data?.length || 0} mensagens recentes carregadas`);
    } catch (error) {
      addLog(`❌ Erro: ${error}`);
    }
  };

  const testSendMessage = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      addLog('❌ Preencha telefone e mensagem');
      return;
    }

    setIsLoading(true);
    addLog(`📤 Enviando mensagem para ${testPhone}...`);

    try {
      const service = createEvolutionWebhookService();
      const success = await service.sendMessage(testPhone, testMessage);
      
      if (success) {
        addLog(`✅ Mensagem enviada com sucesso para ${testPhone}`);
      } else {
        addLog(`❌ Falha ao enviar mensagem para ${testPhone}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao enviar: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhookSimulation = async () => {
    addLog('🧪 Iniciando simulação de webhook...');
    
    const simulatedPayload = {
      event: "messages.upsert",
      instance: webhookConfig?.instanceName || "teste",
      data: {
        key: {
          remoteJid: `${testPhone}@s.whatsapp.net`,
          fromMe: false,
          id: `TEST_${Date.now()}`
        },
        message: {
          conversation: "Teste de simulação webhook"
        },
        messageTimestamp: Date.now(),
        pushName: "Usuário Teste"
      }
    };

    try {
      const service = createEvolutionWebhookService();
      await service.processWebhook(simulatedPayload);
      addLog('✅ Simulação de webhook executada');
    } catch (error) {
      addLog(`❌ Erro na simulação: ${error}`);
    }
  };

  const checkEvolutionAPI = async () => {
    addLog('🔍 Verificando conexão com Evolution API...');
    
    try {
      const service = createEvolutionWebhookService();
      const info = await service.getInstanceInfo();
      
      if (info) {
        addLog('✅ Evolution API respondeu');
        addLog(`📊 Info da instância: ${JSON.stringify(info).substring(0, 100)}...`);
      } else {
        addLog('❌ Evolution API não respondeu');
      }
    } catch (error) {
      addLog(`❌ Erro na conexão: ${error}`);
    }
  };

  const checkDatabaseConnection = async () => {
    addLog('🗄️ Verificando conexão com banco...');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count(*)')
        .limit(1);

      if (error) {
        addLog(`❌ Erro no banco: ${error.message}`);
      } else {
        addLog('✅ Banco de dados conectado');
      }
    } catch (error) {
      addLog(`❌ Erro na conexão com banco: ${error}`);
    }
  };

  const runFullDiagnostic = async () => {
    addLog('🚀 Executando diagnóstico completo...');
    await checkDatabaseConnection();
    await checkEvolutionAPI();
    await loadRecentMessages();
    addLog('✅ Diagnóstico concluído');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bug className="w-8 h-8" />
          Debug WhatsApp Integration
        </h1>
        <p className="text-muted-foreground">Diagnóstico e teste da integração WhatsApp</p>
      </div>

      {/* Status da Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Configuração da Evolution API
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webhookConfig ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">API URL:</span>
                  <p className="font-mono text-xs break-all">{webhookConfig.apiUrl}</p>
                  <Badge variant={webhookConfig.apiUrl.includes('http') ? 'default' : 'destructive'}>
                    {webhookConfig.apiUrl.includes('http') ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">API Key:</span>
                  <p className="font-mono text-xs">{webhookConfig.apiKey.substring(0, 10)}...</p>
                  <Badge variant={webhookConfig.apiKey !== 'NÃO CONFIGURADO' ? 'default' : 'destructive'}>
                    {webhookConfig.apiKey !== 'NÃO CONFIGURADO' ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Instância:</span>
                  <p className="font-mono text-xs">{webhookConfig.instanceName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Webhook URL:</span>
                  <p className="font-mono text-xs break-all">{webhookConfig.webhookUrl}</p>
                </div>
              </div>
            </div>
          ) : (
            <p>Carregando configuração...</p>
          )}
        </CardContent>
      </Card>

      {/* Testes Manuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Teste Manual de Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testPhone">Número de Teste:</Label>
              <Input
                id="testPhone"
                placeholder="5511999999999"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="testMessage">Mensagem:</Label>
              <Input
                id="testMessage"
                placeholder="Teste da Grana IA"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={testSendMessage} disabled={isLoading}>
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? 'Enviando...' : 'Enviar Teste'}
            </Button>
            <Button onClick={testWebhookSimulation} variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Simular Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diagnósticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Diagnósticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={runFullDiagnostic} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Diagnóstico Completo
            </Button>
            <Button onClick={checkEvolutionAPI} variant="outline">
              API Evolution
            </Button>
            <Button onClick={checkDatabaseConnection} variant="outline">
              Banco de Dados
            </Button>
            <Button onClick={loadRecentMessages} variant="outline">
              Mensagens Recentes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mensagens Recentes ({lastMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastMessages.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lastMessages.map((msg, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">{msg.sender === 'user' ? '👤' : '🤖'} {msg.sender}</span>
                    <span className="text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1">{msg.message_text.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
          )}
        </CardContent>
      </Card>

      {/* Logs em Tempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Logs de Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={logs.join('\n')}
            readOnly
            rows={10}
            className="font-mono text-xs bg-black text-green-400"
          />
          <Button 
            onClick={() => setLogs([])} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Limpar Logs
          </Button>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Como debugar:</strong>
          <br />1. Execute o diagnóstico completo
          <br />2. Verifique se todas as configurações estão corretas
          <br />3. Teste o envio manual para seu número
          <br />4. Simule um webhook para testar o processamento
          <br />5. Verifique os logs para identificar erros
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default WebhookDebug;