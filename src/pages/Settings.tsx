import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Phone, User, Shield, CheckCircle, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { createEvolutionWebhookService } from '@/lib/evolution-webhook';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      loadUserProfile();
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      setUserProfile(data);
      setPhone(data.phone || '');
      setFullName(data.full_name || '');
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Formato: 5511999999999 (máximo 13 dígitos)
    if (numbers.length <= 13) {
      return numbers;
    }
    
    return numbers.slice(0, 13);
  };

  const validatePhone = (phoneNumber: string) => {
    // Deve ter entre 10 e 13 dígitos
    // Formato esperado: 5511999999999 (país + área + número)
    const numbers = phoneNumber.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 13;
  };

  const updateProfile = async () => {
    if (!user || !userProfile) return;

    if (phone && !validatePhone(phone)) {
      toast({
        title: "Erro de Validação",
        description: "Número de telefone inválido. Use o formato: 5511999999999",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          phone: phone || null,
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Perfil Atualizado",
        description: "Suas configurações foram salvas com sucesso!",
      });

      // Se telefone foi configurado, enviar mensagem de confirmação
      if (phone && validatePhone(phone)) {
        try {
          const webhookService = createEvolutionWebhookService();
          await webhookService.sendWelcomeMessage(phone, fullName);
          
          toast({
            title: "WhatsApp Configurado",
            description: "Mensagem de confirmação enviada para seu WhatsApp!",
          });
        } catch (whatsappError) {
          console.error('Erro ao enviar mensagem WhatsApp:', whatsappError);
          // Não falhar o processo se WhatsApp der erro
        }
      }

      // Recarregar dados
      await loadUserProfile();

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">⚙️ Configurações</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-8 h-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerencie seu perfil e preferências</p>
      </div>

      {/* Informações da Conta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email não pode ser alterado
              </p>
            </div>
            
            <div>
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="userId">ID do Usuário</Label>
            <Input
              id="userId"
              value={user.id}
              disabled
              className="bg-muted font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuração WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            WhatsApp Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure seu número de WhatsApp para usar a integração com a Grana IA.
              Use o formato internacional sem espaços: <strong>5511999999999</strong>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="phone">Número do WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="5511999999999"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              className={phone && !validatePhone(phone) ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: código do país + DDD + número (ex: 5511999999999)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status WhatsApp:</span>
            {phone && validatePhone(phone) ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configurado
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Não configurado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-4">
        <Button 
          onClick={updateProfile} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Criado em:</span>
              <p className="font-mono">{new Date(user.created_at).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Último login:</span>
              <p className="font-mono">{new Date(user.last_sign_in_at || user.created_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;