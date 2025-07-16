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
    return data;
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