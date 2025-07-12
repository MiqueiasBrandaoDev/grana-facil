import React from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Personalize sua experiência no GranaZen</p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="p-12 text-center">
        <SettingsIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Configurações em Desenvolvimento</h2>
        <p className="text-muted-foreground mb-6">
          As configurações estão sendo desenvolvidas para personalizar sua experiência.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 border rounded-lg">
            <User className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-medium">Perfil</h3>
            <p className="text-sm text-muted-foreground">Gerencie informações pessoais</p>
          </div>
          <div className="p-4 border rounded-lg">
            <Bell className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-medium">Notificações</h3>
            <p className="text-sm text-muted-foreground">Configure alertas e lembretes</p>
          </div>
          <div className="p-4 border rounded-lg">
            <Shield className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-medium">Privacidade</h3>
            <p className="text-sm text-muted-foreground">Controle suas informações</p>
          </div>
          <div className="p-4 border rounded-lg">
            <Palette className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-medium">Aparência</h3>
            <p className="text-sm text-muted-foreground">Temas e personalização</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;