import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { AdminService, AdminUser } from '@/lib/admin';

export interface UseAdminAuthReturn {
  adminUser: AdminUser | null;
  isAdminLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  checkAdminAuth: () => Promise<void>;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const { user } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  const checkAdminAuth = useCallback(async () => {
    try {
      setIsAdminLoading(true);
      const admin = await AdminService.checkAdminAuth(user);
      setAdminUser(admin);
    } catch (error) {
      console.error('Error checking admin auth:', error);
      setAdminUser(null);
    } finally {
      setIsAdminLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkAdminAuth();
    } else {
      setAdminUser(null);
      setIsAdminLoading(false);
    }
  }, [user, checkAdminAuth]);

  return {
    adminUser,
    isAdminLoading,
    isAdmin: !!adminUser && adminUser.is_active,
    isSuperAdmin: !!adminUser && adminUser.role === 'super_admin' && adminUser.is_active,
    checkAdminAuth
  };
};