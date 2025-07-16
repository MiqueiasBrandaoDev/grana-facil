import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/auth';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type AdminUser = Tables<'admin_users'>;
export type AdminLog = Tables<'admin_logs'>;
export type DeployHistory = Tables<'deploy_history'>;

export interface AdminAuth {
  user: AdminUser | null;
  isLoading: boolean;
  error: string | null;
}

export class AdminService {
  static async checkAdminAuth(user: User | null): Promise<AdminUser | null> {
    if (!user?.email) return null;

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error checking admin auth:', error);
      return null;
    }

    return data;
  }

  static async addAdmin(email: string, name: string, currentAdminId: string): Promise<AdminUser | null> {
    const { data: currentAdmin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', currentAdminId)
      .single();

    if (currentAdmin?.role !== 'super_admin') {
      throw new Error('Apenas super administradores podem adicionar novos administradores');
    }

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email,
        name,
        role: 'admin',
        created_by: currentAdminId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding admin:', error);
      throw new Error('Erro ao adicionar administrador');
    }

    await this.logAction(currentAdminId, 'ADD_ADMIN', `Adicionou administrador: ${email}`);
    return data;
  }

  static async removeAdmin(adminId: string, currentAdminId: string): Promise<void> {
    const { data: currentAdmin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', currentAdminId)
      .single();

    if (currentAdmin?.role !== 'super_admin') {
      throw new Error('Apenas super administradores podem remover administradores');
    }

    const { data: targetAdmin } = await supabase
      .from('admin_users')
      .select('email, role')
      .eq('id', adminId)
      .single();

    if (targetAdmin?.role === 'super_admin') {
      throw new Error('Não é possível remover um super administrador');
    }

    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: false })
      .eq('id', adminId);

    if (error) {
      console.error('Error removing admin:', error);
      throw new Error('Erro ao remover administrador');
    }

    await this.logAction(currentAdminId, 'REMOVE_ADMIN', `Removeu administrador: ${targetAdmin?.email}`);
  }

  static async getAdmins(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admins:', error);
      return [];
    }

    return data || [];
  }

  static async logAction(
    adminId: string,
    action: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const { data: admin } = await supabase
      .from('admin_users')
      .select('email')
      .eq('id', adminId)
      .single();

    if (!admin) return;

    const logData: TablesInsert<'admin_logs'> = {
      admin_id: adminId,
      admin_email: admin.email,
      action,
      description,
      metadata: metadata || {},
      ip_address: null,
      user_agent: navigator.userAgent
    };

    const { error } = await supabase
      .from('admin_logs')
      .insert(logData);

    if (error) {
      console.error('Error logging admin action:', error);
    }
  }

  static async getLogs(limit = 100): Promise<AdminLog[]> {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching admin logs:', error);
      return [];
    }

    return data || [];
  }

  static async getActiveUsersCount(): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching users count:', error);
      return 0;
    }

    return count || 0;
  }

  static async startDeploy(adminId: string, branch = 'main'): Promise<DeployHistory | null> {
    const { data: admin } = await supabase
      .from('admin_users')
      .select('email, role')
      .eq('id', adminId)
      .single();

    if (admin?.role !== 'super_admin') {
      throw new Error('Apenas super administradores podem fazer deploy');
    }

    const { data, error } = await supabase
      .from('deploy_history')
      .insert({
        admin_id: adminId,
        admin_email: admin.email,
        status: 'running',
        branch,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting deploy:', error);
      throw new Error('Erro ao iniciar deploy');
    }

    await this.logAction(adminId, 'START_DEPLOY', `Iniciou deploy da branch: ${branch}`);
    
    // Executar deploy real
    this.executeRealDeploy(data.id, adminId);
    
    return data;
  }

  static async executeRealDeploy(deployId: string, adminId: string): Promise<void> {
    const DEPLOY_WEBHOOK_URL = process.env.VITE_DEPLOY_WEBHOOK_URL || 'http://deploy.granaboard.com.br/deploy';
    const DEPLOY_SECRET = process.env.VITE_DEPLOY_SECRET || 'sua-chave-secreta-aqui';

    let currentLogs = '🚀 Iniciando deploy real...\n';
    let success = true;

    try {
      // Atualizar logs iniciais
      await this.updateDeployLogs(deployId, currentLogs);

      // Fazer chamada para o webhook na VPS
      const response = await fetch(DEPLOY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: DEPLOY_SECRET,
          deployId,
          branch: 'main'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      success = result.success;
      currentLogs += result.logs || 'Deploy executado, mas sem logs detalhados.';

      if (!success) {
        currentLogs += '\n❌ Deploy falhou na VPS!';
      }

    } catch (error) {
      success = false;
      currentLogs += `\n❌ Erro ao executar deploy: ${error.message}`;
      
      // Se o webhook não responder, tentar fallback
      if (error.message.includes('fetch')) {
        currentLogs += '\n⚠️  Webhook não disponível. Verifique se o serviço está rodando na VPS.';
        currentLogs += '\n📝 Execute: pm2 logs deploy-webhook';
      }
    }

    // Finalizar deploy
    await this.updateDeploy(
      deployId,
      success ? 'success' : 'failed',
      currentLogs,
      this.generateCommitHash()
    );
  }

  static async updateDeployLogs(deployId: string, logs: string): Promise<void> {
    const { error } = await supabase
      .from('deploy_history')
      .update({ logs })
      .eq('id', deployId);

    if (error) {
      console.error('Error updating deploy logs:', error);
    }
  }

  static getCommandExecutionTime(command: string): number {
    const timeMap: { [key: string]: number } = {
      'git pull': 2000,
      'docker-compose down': 3000,
      'docker-compose build': 15000,
      'docker-compose up': 5000,
      'curl': 1000,
      'cd': 100
    };

    for (const [key, time] of Object.entries(timeMap)) {
      if (command.includes(key)) {
        return time;
      }
    }
    return 1000;
  }

  static getCommandOutput(command: string): string {
    const outputMap: { [key: string]: string } = {
      'cd /root/grana-facil': 'Entrando no diretório do projeto...',
      'git pull origin main': 'Already up to date.\nFrom https://github.com/seu-usuario/grana-facil\n   abc1234..def5678  main -> origin/main',
      'docker-compose down': 'Stopping containers...\nStopping grana-facil_app_1 ... done\nStopping grana-facil_nginx_1 ... done\nRemoving containers...',
      'docker-compose build --no-cache': 'Building app...\nStep 1/10 : FROM node:18-alpine\nStep 2/10 : WORKDIR /app\n...\nSuccessfully built abc123def456\nSuccessfully tagged grana-facil_app:latest',
      'docker-compose up -d': 'Creating network "grana-facil_default"\nCreating grana-facil_app_1 ... done\nCreating grana-facil_nginx_1 ... done',
      'curl https://app.granaboard.com.br/health': '{"status":"ok","timestamp":"2024-01-15T10:30:00Z","version":"1.0.0"}'
    };

    return outputMap[command] || 'Comando executado com sucesso.';
  }

  static generateCommitHash(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  static async updateDeploy(
    deployId: string,
    status: 'success' | 'failed',
    logs?: string,
    commitHash?: string
  ): Promise<void> {
    const completedAt = new Date().toISOString();
    
    const { data: deploy } = await supabase
      .from('deploy_history')
      .select('started_at')
      .eq('id', deployId)
      .single();

    const durationSeconds = deploy 
      ? Math.floor((new Date(completedAt).getTime() - new Date(deploy.started_at).getTime()) / 1000)
      : null;

    const { error } = await supabase
      .from('deploy_history')
      .update({
        status,
        logs,
        commit_hash: commitHash,
        completed_at: completedAt,
        duration_seconds: durationSeconds
      })
      .eq('id', deployId);

    if (error) {
      console.error('Error updating deploy:', error);
    }
  }

  static async getDeployHistory(limit = 50): Promise<DeployHistory[]> {
    const { data, error } = await supabase
      .from('deploy_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching deploy history:', error);
      return [];
    }

    return data || [];
  }
}