import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowUpDown,
  MessageSquare,
  Target,
  BarChart3,
  CreditCard,
  Settings,
  Wallet,
  TrendingUp,
  Calendar,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const sidebarItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Visão geral financeira'
  },
  {
    name: 'Transações',
    href: '/transactions',
    icon: ArrowUpDown,
    description: 'Receitas e despesas'
  },
  {
    name: 'Categorias',
    href: '/categories',
    icon: Wallet,
    description: 'Gestão de categorias'
  },
  {
    name: 'Metas',
    href: '/goals',
    icon: Target,
    description: 'Objetivos financeiros'
  },
  {
    name: 'Contas',
    href: '/bills',
    icon: Calendar,
    description: 'A pagar e receber'
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
    description: 'Análises e gráficos'
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    description: 'Ajustes do sistema'
  }
];

const whatsappItem = {
  name: 'WhatsApp',
  href: '/whatsapp',
  icon: MessageSquare,
  description: 'Controle por mensagem'
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, isMobile = false }) => {
  const location = useLocation();
  const { isAdmin } = useAdminAuth();

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
      isMobile ? (
        collapsed ? "w-0 -translate-x-full opacity-0" : "w-64 translate-x-0 opacity-100 fixed inset-y-0 left-0 z-50 shadow-xl"
      ) : (
        collapsed ? "w-16" : "w-64"
      )
    )}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">Grana Board</h1>
              <p className="text-xs text-sidebar-foreground/60">Controle Financeiro</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Regular Navigation Items */}
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20 shadow-sm" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={cn(
                "shrink-0 transition-colors",
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
                collapsed ? "w-5 h-5" : "w-4 h-4"
              )} />
              
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm truncate",
                    isActive ? "text-sidebar-primary" : ""
                  )}>
                    {item.name}
                  </div>
                  <div className="text-xs text-sidebar-foreground/50 truncate">
                    {item.description}
                  </div>
                </div>
              )}
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
              )}
            </NavLink>
          );
        })}
        
        {/* WhatsApp Item with Green Highlight */}
        <div className="mt-4 pt-4 border-t border-sidebar-border/50">
          {(() => {
            const isActive = location.pathname === whatsappItem.href;
            const Icon = whatsappItem.icon;
            
            return (
              <NavLink
                to={whatsappItem.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  "bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30",
                  "hover:from-green-500/30 hover:to-green-600/30 hover:border-green-500/40",
                  isActive 
                    ? "bg-gradient-to-r from-green-500/40 to-green-600/40 border-green-500/50 shadow-lg shadow-green-500/20" 
                    : ""
                )}
                title={collapsed ? whatsappItem.name : undefined}
              >
                <Icon className={cn(
                  "shrink-0 transition-colors text-green-600 dark:text-green-400",
                  collapsed ? "w-5 h-5" : "w-4 h-4"
                )} />
                
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm truncate text-green-700 dark:text-green-300",
                      isActive ? "text-green-800 dark:text-green-200" : ""
                    )}>
                      {whatsappItem.name}
                    </div>
                    <div className="text-xs text-green-600/70 dark:text-green-400/70 truncate">
                      {whatsappItem.description}
                    </div>
                  </div>
                )}
                
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r-full" />
                )}
              </NavLink>
            );
          })()}
        </div>
        
        {/* Admin Panel - Only visible to admin users */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-sidebar-border/50">
            {(() => {
              const isActive = location.pathname === '/admin';
              const Icon = Shield;
              
              return (
                <NavLink
                  to="/admin"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    "bg-gradient-to-r from-orange-500/20 to-red-600/20 border border-orange-500/30",
                    "hover:from-orange-500/30 hover:to-red-600/30 hover:border-orange-500/40",
                    isActive 
                      ? "bg-gradient-to-r from-orange-500/40 to-red-600/40 border-orange-500/50 shadow-lg shadow-orange-500/20" 
                      : ""
                  )}
                  title={collapsed ? 'Painel Admin' : undefined}
                >
                  <Icon className={cn(
                    "shrink-0 transition-colors text-orange-600 dark:text-orange-400",
                    collapsed ? "w-5 h-5" : "w-4 h-4"
                  )} />
                  
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-medium text-sm truncate text-orange-700 dark:text-orange-300",
                        isActive ? "text-orange-800 dark:text-orange-200" : ""
                      )}>
                        Painel Admin
                      </div>
                      <div className="text-xs text-orange-600/70 dark:text-orange-400/70 truncate">
                        Administração do sistema
                      </div>
                    </div>
                  )}
                  
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />
                  )}
                </NavLink>
              );
            })()}
          </div>
        )}
      </nav>

    </div>
  );
};

export default Sidebar;