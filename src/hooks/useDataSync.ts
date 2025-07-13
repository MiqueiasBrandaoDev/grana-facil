import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * 🔄 Hook para sincronização automática de dados
 * Invalida todas as queries relevantes quando a IA executa ações
 */
export const useDataSync = () => {
  const queryClient = useQueryClient();

  /**
   * 🚀 Sincronizar todos os dados após ação da IA
   */
  const syncAllData = useCallback(async () => {
    console.log('🔄 Iniciando sincronização completa de dados...');
    
    // Invalidar todas as queries em paralelo para máxima velocidade
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['balance'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['goals'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['bills'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['monthly-report'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['activity-log'], exact: false })
    ]);

    // Aguardar um pouco para as queries se atualizarem
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Forçar refetch das queries mais importantes
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['transactions'] }),
      queryClient.refetchQueries({ queryKey: ['balance'] }),
      queryClient.refetchQueries({ queryKey: ['activity-log'] })
    ]);

    console.log('🔄 Dados sincronizados completamente após ação da IA');
  }, [queryClient]);

  /**
   * 💰 Sincronizar apenas dados financeiros (transações, saldo)
   */
  const syncFinancialData = useCallback(async () => {
    console.log('🔄 Iniciando sincronização de dados financeiros...');
    
    // Invalidar queries com mais força
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['balance'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['monthly-report'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['activity-log'], exact: false })
    ]);

    // Aguardar um pouco para as queries se atualizarem
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Forçar refetch das queries principais
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['transactions'] }),
      queryClient.refetchQueries({ queryKey: ['balance'] })
    ]);

    console.log('💰 Dados financeiros sincronizados com força');
  }, [queryClient]);

  /**
   * 🏷️ Sincronizar categorias
   */
  const syncCategories = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }) // Transações dependem de categorias
    ]);

    console.log('🏷️ Categorias sincronizadas');
  }, [queryClient]);

  /**
   * 🎯 Sincronizar metas
   */
  const syncGoals = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['goals'] });
    console.log('🎯 Metas sincronizadas');
  }, [queryClient]);

  /**
   * 💳 Sincronizar contas
   */
  const syncBills = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bills'] });
    console.log('💳 Contas sincronizadas');
  }, [queryClient]);

  /**
   * ⚡ Forçar refresh de uma query específica
   */
  const forceRefresh = useCallback(async (queryKey: string[]) => {
    await queryClient.invalidateQueries({ queryKey });
    console.log(`⚡ Query ${queryKey.join(':')} forçada a atualizar`);
  }, [queryClient]);

  /**
   * 🧹 Limpar cache de todas as queries
   */
  const clearAllCache = useCallback(() => {
    queryClient.clear();
    console.log('🧹 Cache limpo completamente');
  }, [queryClient]);

  /**
   * 📊 Obter estatísticas do cache
   */
  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length
    };

    return stats;
  }, [queryClient]);

  return {
    syncAllData,
    syncFinancialData,
    syncCategories,
    syncGoals,
    syncBills,
    forceRefresh,
    clearAllCache,
    getCacheStats
  };
};