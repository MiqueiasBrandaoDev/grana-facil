import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AdminService, AdminUser, AdminLog, DeployHistory } from '@/lib/admin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  Activity, 
  Rocket,
  UserPlus,
  UserMinus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  LogIn
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [deployHistory, setDeployHistory] = useState<DeployHistory[]>([]);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading) {
      checkAdminAuth();
    }
  }, [user, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const checkAdminAuth = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const admin = await AdminService.checkAdminAuth(user);
      
      if (!admin) {
        toast.error('Acesso negado. Você não tem permissão para acessar o painel administrativo.');
        setIsLoading(false);
        return;
      }

      setAdminUser(admin);
      await loadDashboardData();
    } catch (error) {
      console.error('❌ Erro ao verificar auth admin:', error);
      toast.error('Erro ao verificar permissões de administrador.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [adminsData, logsData, deployData, usersCount] = await Promise.all([
        AdminService.getAdmins(),
        AdminService.getLogs(),
        AdminService.getDeployHistory(),
        AdminService.getActiveUsersCount()
      ]);

      setAdmins(adminsData);
      setLogs(logsData);
      setDeployHistory(deployData);
      setActiveUsers(usersCount);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    }
  };

  const handleAddAdmin = async () => {
    if (!adminUser || !newAdminEmail || !newAdminName) return;

    try {
      await AdminService.addAdmin(newAdminEmail, newAdminName, adminUser.id);
      toast.success('Administrador adicionado com sucesso');
      setNewAdminEmail('');
      setNewAdminName('');
      await loadDashboardData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar administrador';
      toast.error(errorMessage);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!adminUser) return;

    try {
      await AdminService.removeAdmin(adminId, adminUser.id);
      toast.success('Administrador removido com sucesso');
      await loadDashboardData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover administrador';
      toast.error(errorMessage);
    }
  };

  const handleDeploy = async () => {
    if (!adminUser || adminUser.role !== 'super_admin') {
      toast.error('Apenas super administradores podem fazer deploy');
      return;
    }

    try {
      setIsDeploying(true);
      const deploy = await AdminService.startDeploy(adminUser.id);
      
      if (deploy) {
        toast.success('Deploy iniciado com sucesso');
        setTimeout(async () => {
          await AdminService.updateDeploy(deploy.id, 'success', 'Deploy simulado concluído');
          setIsDeploying(false);
          await loadDashboardData();
          toast.success('Deploy concluído com sucesso');
        }, 5000);
      }
    } catch (error) {
      setIsDeploying(false);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar deploy';
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      running: { label: 'Executando', variant: 'default' as const, icon: Clock },
      success: { label: 'Sucesso', variant: 'default' as const, icon: CheckCircle },
      failed: { label: 'Falhou', variant: 'destructive' as const, icon: XCircle }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.running;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Login Administrativo
            </CardTitle>
            <CardDescription>
              Faça login para acessar o painel administrativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? 'Fazendo login...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para acessar este painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Usuário logado: {user.email}
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Voltar ao App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativoooo</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {adminUser.name} ({adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'})
          </p>
        </div>
        <Button onClick={() => navigate('/')} variant="outline">
          Voltar ao App
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Total de usuários registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.filter(a => a.is_active).length}</div>
            <p className="text-xs text-muted-foreground">Administradores ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(log => new Date(log.created_at).toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-muted-foreground">Ações registradas hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deploy Status</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {adminUser.role === 'super_admin' && (
                <Button 
                  onClick={handleDeploy} 
                  disabled={isDeploying}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Play className="h-3 w-3" />
                  {isDeploying ? 'Executando...' : 'Deploy'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {adminUser.role === 'super_admin' ? 'Clique para fazer deploy' : 'Apenas super admin'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Logs de Atividade</TabsTrigger>
          <TabsTrigger value="admins">Administradores</TabsTrigger>
          <TabsTrigger value="deploys">Histórico de Deploys</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs de Atividade
              </CardTitle>
              <CardDescription>
                Últimas ações realizadas pelos administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-sm text-muted-foreground">{log.admin_email}</span>
                      </div>
                      {log.description && (
                        <p className="text-sm text-muted-foreground">{log.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciar Administradores
              </CardTitle>
              <CardDescription>
                Adicione ou remova administradores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {adminUser.role === 'super_admin' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Adicionar Administrador
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Administrador</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="admin@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">Nome</Label>
                        <Input
                          id="name"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          placeholder="Nome do administrador"
                        />
                      </div>
                      <Button onClick={handleAddAdmin} className="w-full">
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <div className="space-y-2">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{admin.name}</span>
                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                        {!admin.is_active && (
                          <Badge variant="destructive">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Criado em: {formatDate(admin.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {adminUser.role === 'super_admin' && 
                       admin.role !== 'super_admin' && 
                       admin.is_active && (
                        <Button
                          onClick={() => handleRemoveAdmin(admin.id)}
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <UserMinus className="h-3 w-3" />
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deploys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Histórico de Deploys
              </CardTitle>
              <CardDescription>
                Histórico de todas as execuções de deploy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deployHistory.map((deploy) => (
                  <div key={deploy.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(deploy.status)}
                        <span className="text-sm text-muted-foreground">{deploy.admin_email}</span>
                        <Badge variant="outline">{deploy.branch}</Badge>
                      </div>
                      {deploy.commit_hash && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {deploy.commit_hash.substring(0, 8)}
                        </p>
                      )}
                      {deploy.duration_seconds && (
                        <p className="text-xs text-muted-foreground">
                          Duração: {deploy.duration_seconds}s
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(deploy.started_at)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;