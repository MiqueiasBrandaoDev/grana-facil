import React from 'react';
import { Calendar, Tag, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCardPurchases } from '@/hooks/useCards';

interface CardPurchaseHistoryProps {
  cardId?: string;
}

const CardPurchaseHistory: React.FC<CardPurchaseHistoryProps> = ({ cardId }) => {
  const { data: purchases, isLoading } = useCardPurchases(cardId || '');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (!cardId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecione um cartão para ver o histórico
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Nenhuma compra encontrada
        </h3>
        <p className="text-sm text-muted-foreground">
          As compras realizadas neste cartão aparecerão aqui
        </p>
      </div>
    );
  }

  const groupedPurchases = purchases.reduce((acc, purchase) => {
    const key = `${purchase.invoice_month}/${purchase.invoice_year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(purchase);
    return acc;
  }, {} as Record<string, typeof purchases>);

  const sortedInvoices = Object.keys(groupedPurchases).sort((a, b) => {
    const [monthA, yearA] = a.split('/').map(Number);
    const [monthB, yearB] = b.split('/').map(Number);
    
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  });

  // Separar compras pagas e não pagas
  const allPurchases = purchases || [];
  const unpaidPurchases = allPurchases.filter(p => !p.is_paid);
  const paidPurchases = allPurchases.filter(p => p.is_paid);

  return (
    <div className="space-y-6">
      {/* Fatura Atual - apenas compras não pagas */}
      {unpaidPurchases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                Fatura Atual
              </h3>
              <Badge variant="destructive">
                <Clock className="w-3 h-3 mr-1" />
                Pendente
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(unpaidPurchases.reduce((sum, p) => sum + p.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {unpaidPurchases.length} compras pendentes
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            {unpaidPurchases.map((purchase) => (
              <Card 
                key={purchase.id} 
                className="hover:shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">
                          {purchase.description}
                        </h4>
                        {purchase.installments > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {purchase.current_installment}/{purchase.installments}x
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(purchase.purchase_date)}
                        </div>
                        
                        {purchase.category_name && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span 
                              className="px-2 py-1 rounded-full text-xs"
                              style={{ 
                                backgroundColor: purchase.category_color + '20',
                                color: purchase.category_color 
                              }}
                            >
                              {purchase.category_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(purchase.amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de Faturas Pagas */}
      {paidPurchases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                Histórico de Compras Pagas
              </h3>
              <Badge 
                variant="default"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Pagas
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(paidPurchases.reduce((sum, p) => sum + p.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {paidPurchases.length} compras pagas
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            {paidPurchases.map((purchase) => (
                <Card 
                  key={purchase.id} 
                  className={`transition-all ${
                    purchase.is_paid 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                      : 'hover:shadow-sm'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${
                            purchase.is_paid 
                              ? 'text-green-700 dark:text-green-300 line-through' 
                              : 'text-foreground'
                          }`}>
                            {purchase.description}
                          </h4>
                          {purchase.installments > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {purchase.current_installment}/{purchase.installments}x
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(purchase.purchase_date)}
                          </div>
                          
                          {purchase.category_name && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <span 
                                className="px-2 py-1 rounded-full text-xs"
                                style={{ 
                                  backgroundColor: purchase.category_color + '20',
                                  color: purchase.category_color 
                                }}
                              >
                                {purchase.category_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          purchase.is_paid 
                            ? 'text-green-600 dark:text-green-400 line-through' 
                            : 'text-foreground'
                        }`}>
                          {formatCurrency(purchase.amount)}
                        </p>
                        
                        {purchase.is_paid && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Pago
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardPurchaseHistory;