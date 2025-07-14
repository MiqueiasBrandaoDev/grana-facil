import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
        isMobile={isMobile}
      />
      
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        isMobile ? "w-full" : ""
      )}>
        <Header 
          onToggleSidebar={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
        />
        
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          isMobile ? "p-4" : "p-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;