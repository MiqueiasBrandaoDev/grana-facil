import React, { useState } from 'react';
import { Calendar, CreditCard, DollarSign, Clock, CheckCircle2, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCardMonthlyInvoices, useCardInvoicePurchases, useMarkInvoiceAsPaid } from '@/hooks/useCards';
import type { CardWithPurchases } from '@/hooks/useCards';

interface CardInvoicesTabsProps {
  card: CardWithPurchases;
}

const CardInvoicesTabs: React.FC<CardInvoicesTabsProps> = ({ card }) => {
  const { data: invoices, isLoading } = useCardMonthlyInvoices(card.id);
  const markInvoiceAsPaid = useMarkInvoiceAsPaid();
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const handlePayInvoice = async (cardId: string, month: number, year: number, amount: number, isPartial: boolean = false) => {
    const invoiceKey = `${cardId}-${month}-${year}`;
    setPayingInvoice(invoiceKey);
    
    try {
      if (isPartial) {
        await markInvoiceAsPaid.mutateAsync({ 
          cardId, 
          invoiceMonth: month, 
          invoiceYear: year,
          partialAmount: amount 
        });
      } else {
        await markInvoiceAsPaid.mutateAsync({ 
          cardId, 
          invoiceMonth: month, 
          invoiceYear: year
        });
      }
    } finally {
      setPayingInvoice(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Carregando faturas...</span>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Nenhuma fatura encontrada
        </h3>
        <p className="text-sm text-muted-foreground">
          As faturas aparecerão aqui quando você fizer compras
        </p>
      </div>
    );
  }

  // Ordenar faturas: mês atual primeiro, depois os próximos, depois os anteriores
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const sortedInvoices = [...(invoices || [])].sort((a, b) => {
    // Calcular "distância" do mês atual
    const getDistance = (invoice: any) => {
      const monthDiff = (invoice.invoice_year - currentYear) * 12 + (invoice.invoice_month - currentMonth);
      return Math.abs(monthDiff);
    };
    
    const distanceA = getDistance(a);
    const distanceB = getDistance(b);
    
    // Se as distâncias são iguais, priorizar futuro sobre passado
    if (distanceA === distanceB) {
      const futureA = (a.invoice_year - currentYear) * 12 + (a.invoice_month - currentMonth);
      const futureB = (b.invoice_year - currentYear) * 12 + (b.invoice_month - currentMonth);
      return futureB - futureA; // Futuro primeiro
    }
    
    return distanceA - distanceB;
  });

  // Pegar a primeira fatura (mês atual ou mais próximo) como default
  const defaultTab = sortedInvoices[0] ? `${sortedInvoices[0].invoice_month}-${sortedInvoices[0].invoice_year}` : '';

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{card.nickname}</h2>
        <p className="text-muted-foreground">Vencimento todo dia {card.due_day}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-muted/30">
          {sortedInvoices.slice(0, 6).map((invoice) => {
            const isCurrentMonth = invoice.invoice_month === currentMonth && invoice.invoice_year === currentYear;
            const isFuture = (invoice.invoice_year > currentYear) || 
                           (invoice.invoice_year === currentYear && invoice.invoice_month > currentMonth);
            
            return (
              <TabsTrigger 
                key={`${invoice.invoice_month}-${invoice.invoice_year}`}
                value={`${invoice.invoice_month}-${invoice.invoice_year}`}
                className={`flex flex-col p-3 h-auto transition-all duration-300 hover:scale-105 ${
                  isCurrentMonth ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg' : 
                  'hover:bg-muted/50'
                }`}
              >
                <span className={`text-xs font-medium transition-colors ${
                  isCurrentMonth ? 'text-blue-700 dark:text-blue-300' : ''
                }`}>
                  {getMonthName(invoice.invoice_month)}
                  {isCurrentMonth && (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1 animate-pulse"></span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {invoice.invoice_year}
                </span>
                {invoice.pending_amount > 0 && (
                  <div className={`w-2 h-2 rounded-full mt-1 transition-colors animate-pulse ${
                    isCurrentMonth ? 'bg-blue-500' : 
                    isFuture ? 'bg-orange-500' : 'bg-red-500'
                  }`}></div>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedInvoices.map((invoice) => (
          <TabsContent 
            key={`${invoice.invoice_month}-${invoice.invoice_year}`}
            value={`${invoice.invoice_month}-${invoice.invoice_year}`}
            className="space-y-4 animate-in fade-in-50 duration-300"
          >
            <InvoiceContent 
              invoice={invoice} 
              onPayInvoice={handlePayInvoice}
              isPaying={payingInvoice === `${invoice.card_id}-${invoice.invoice_month}-${invoice.invoice_year}`}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface InvoiceContentProps {
  invoice: any;
  onPayInvoice: (cardId: string, month: number, year: number, amount: number, isPartial?: boolean) => void;
  isPaying: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ 
  invoice, 
  onPayInvoice, 
  isPaying, 
  formatCurrency, 
  formatDate 
}) => {
  const { data: purchases, isLoading } = useCardInvoicePurchases(
    invoice.card_id, 
    invoice.invoice_month, 
    invoice.invoice_year
  );
  
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState<number>(0);

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Carregando compras...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Fatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Fatura de {getMonthName(invoice.invoice_month)} {invoice.invoice_year}</span>
            </div>
            <div className="flex items-center gap-2">
              {invoice.pending_amount > 0 ? (
                <Badge variant="destructive">
                  <Clock className="w-3 h-3 mr-1" />
                  Pendente
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Paga
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Valor Pendente</div>
              <div className={`text-2xl font-bold ${invoice.pending_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(invoice.pending_amount)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <span>Vencimento: {formatDate(invoice.due_date)}</span>
            <span>{invoice.total_purchases} compra{invoice.total_purchases !== 1 ? 's' : ''}</span>
          </div>

          {invoice.pending_amount > 0 && (
            <div className="space-y-3">
              {!showPartialPayment ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => onPayInvoice(invoice.card_id, invoice.invoice_month, invoice.invoice_year, invoice.pending_amount)}
                    disabled={isPaying}
                    size="lg"
                    className="flex-1"
                  >
                    {isPaying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pagar Fatura
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowPartialPayment(true);
                      setPartialAmount(invoice.pending_amount / 2);
                    }}
                    disabled={isPaying}
                    size="lg"
                  >
                    Pagamento Parcial
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Pagamento Parcial</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowPartialPayment(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partial-amount">Quanto você quer pagar?</Label>
                    <Input
                      id="partial-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={invoice.pending_amount}
                      value={partialAmount || ''}
                      onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-center text-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPartialAmount(invoice.pending_amount / 2)}
                        className="flex-1"
                      >
                        Metade
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPartialAmount(invoice.pending_amount * 0.8)}
                        className="flex-1"
                      >
                        80%
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-3 rounded text-sm">
                    <p className="text-blue-700 dark:text-blue-300">
                      ✅ O restante ({formatCurrency(invoice.pending_amount - (partialAmount || 0))}) será transferido para a próxima fatura
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      onPayInvoice(invoice.card_id, invoice.invoice_month, invoice.invoice_year, partialAmount, true);
                      setShowPartialPayment(false);
                    }}
                    disabled={isPaying || !partialAmount || partialAmount <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {isPaying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pagar {formatCurrency(partialAmount || 0)}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Compras */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Compras desta fatura</h3>
        
        {purchases && purchases.length > 0 ? (
          <div className="grid gap-3">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className={purchase.is_paid ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${purchase.is_paid ? 'line-through text-green-600' : ''}`}>
                          {purchase.display_description}
                        </h4>
                        {purchase.is_installment && (
                          <Badge variant="outline" className="text-xs">
                            Parcela {purchase.installment_number}/{purchase.total_installments}
                          </Badge>
                        )}
                        {purchase.is_paid && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Pago
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
                      <p className={`text-lg font-bold ${purchase.is_paid ? 'line-through text-green-600' : ''}`}>
                        {formatCurrency(purchase.amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma compra nesta fatura</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardInvoicesTabs;