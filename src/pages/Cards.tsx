import React, { useState } from 'react';
import { Plus, CreditCard, Calendar, Trash2, Edit, DollarSign, Clock, CheckCircle, Info, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCards, useCreateCard, useUpdateCard, useDeleteCard, useMarkInvoiceAsPaid, useCreatePurchase, useCardPurchases, type CreateCardData, type CreatePurchaseData } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import CardPurchaseHistory from '@/components/cards/CardPurchaseHistory';

const cardSchema = z.object({
  nickname: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  due_day: z.number().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31'),
  limit_amount: z.number().optional(),
});

const purchaseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  category_id: z.string().optional(),
  purchase_date: z.string().optional(),
  installments: z.number().min(1, 'Parcelas deve ser pelo menos 1').optional(),
});

const Cards: React.FC = () => {
  const { data: cards, isLoading } = useCards();
  const { categories, loading: categoriesLoading } = useCategories();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const markInvoiceAsPaid = useMarkInvoiceAsPaid();
  const createPurchase = useCreatePurchase();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const cardForm = useForm<CreateCardData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      nickname: '',
      due_day: 1,
      limit_amount: 0,
    },
  });

  const purchaseForm = useForm<CreatePurchaseData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      installments: 1,
      purchase_date: new Date().toISOString().split('T')[0],
      card_id: '',
      category_id: 'none',
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleCreateCard = async (data: CreateCardData) => {
    await createCard.mutateAsync(data);
    setIsCreateDialogOpen(false);
    cardForm.reset();
  };

  const handleEditCard = async (data: CreateCardData) => {
    if (!selectedCard) return;
    await updateCard.mutateAsync({ id: selectedCard.id, ...data });
    setIsEditDialogOpen(false);
    setSelectedCard(null);
    cardForm.reset();
  };

  const handleDeleteCard = async (cardId: string) => {
    if (confirm('Tem certeza que deseja excluir este cartão?')) {
      await deleteCard.mutateAsync(cardId);
    }
  };

  const openPaymentConfirm = (card: any) => {
    setSelectedCard(card);
    setIsPaymentConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedCard) return;
    await markInvoiceAsPaid.mutateAsync(selectedCard.id);
    setIsPaymentConfirmOpen(false);
    setSelectedCard(null);
  };

  const handleAddPurchase = async (data: CreatePurchaseData) => {
    if (!selectedCard) return;
    await createPurchase.mutateAsync({ ...data, card_id: selectedCard.id });
    setIsPurchaseDialogOpen(false);
    setSelectedCard(null);
    purchaseForm.reset();
  };

  const openEditDialog = (card: any) => {
    setSelectedCard(card);
    cardForm.reset({
      nickname: card.nickname || '',
      due_day: card.due_day || 1,
      limit_amount: card.limit_amount || 0,
    });
    setIsEditDialogOpen(true);
  };

  const openPurchaseDialog = (card: any) => {
    setSelectedCard(card);
    purchaseForm.reset({
      description: '',
      amount: 0,
      installments: 1,
      purchase_date: new Date().toISOString().split('T')[0],
      card_id: card.id,
      category_id: 'none',
    });
    setIsPurchaseDialogOpen(true);
  };

  const openHistoryDialog = (card: any) => {
    setSelectedCard(card);
    setIsHistoryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando cartões...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cartões</h1>
          <p className="text-muted-foreground">Gerencie seus cartões de crédito e compras</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Cartão
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards?.map((card) => (
          <Card key={card.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{card.nickname}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openHistoryDialog(card)}
                    className="h-8 w-8 p-0"
                    title="Ver histórico de compras"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(card)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Vencimento dia {card.due_day}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fatura Atual:</span>
                  <span className="font-medium">{formatCurrency(card.pending_amount)}</span>
                </div>
                {card.limit_amount && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Limite:</span>
                    <span>{formatCurrency(card.limit_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Compras Pendentes:</span>
                  <span>{card.pending_purchases}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {card.current_invoice_paid ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Fatura Paga
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Fatura Pendente
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPurchaseDialog(card)}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Compra
                </Button>
                {!card.current_invoice_paid && card.pending_amount > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openPaymentConfirm(card)}
                    className="gap-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    Pagar Fatura
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para criar cartão */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cartão</DialogTitle>
            <DialogDescription>
              Cadastre um novo cartão de crédito
            </DialogDescription>
          </DialogHeader>
          <Form {...cardForm}>
            <form onSubmit={cardForm.handleSubmit(handleCreateCard)} className="space-y-4">
              <FormField
                control={cardForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Apelido</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank, Itaú..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={cardForm.control}
                name="due_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Vencimento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Dia do mês"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={cardForm.control}
                name="limit_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createCard.isPending}>
                  {createCard.isPending ? 'Criando...' : 'Criar Cartão'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar cartão */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cartão</DialogTitle>
            <DialogDescription>
              Edite as informações do cartão
            </DialogDescription>
          </DialogHeader>
          <Form {...cardForm}>
            <form onSubmit={cardForm.handleSubmit(handleEditCard)} className="space-y-4">
              <FormField
                control={cardForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Apelido</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank, Itaú..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={cardForm.control}
                name="due_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Vencimento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Dia do mês"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={cardForm.control}
                name="limit_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateCard.isPending}>
                  {updateCard.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar compra */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Compra</DialogTitle>
            <DialogDescription>
              Registre uma compra no cartão {selectedCard?.nickname}
            </DialogDescription>
          </DialogHeader>
          <Form {...purchaseForm}>
            <form onSubmit={purchaseForm.handleSubmit(handleAddPurchase)} className="space-y-4">
              <FormField
                control={purchaseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Compras no mercado..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma categoria</SelectItem>
                        {categoriesLoading ? (
                          <SelectItem value="loading" disabled>Carregando categorias...</SelectItem>
                        ) : categories && categories.length > 0 ? (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhuma categoria criada</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Compra</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createPurchase.isPending}>
                  {createPurchase.isPending ? 'Registrando...' : 'Registrar Compra'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPurchaseDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de pagamento */}
      <AlertDialog open={isPaymentConfirmOpen} onOpenChange={setIsPaymentConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento da Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a marcar a fatura do cartão <strong>{selectedCard?.nickname}</strong> como paga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Valor da fatura:</span>
                <span className="font-semibold text-destructive">
                  {selectedCard ? formatCurrency(selectedCard.pending_amount) : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Compras pendentes:</span>
                <span className="font-medium">
                  {selectedCard?.pending_purchases || 0} compras
                </span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Isso criará automaticamente uma transação de despesa no valor total da fatura e marcará todas as compras como pagas.
            </p>
            
            <p className="text-sm font-medium text-destructive">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmPayment}
              disabled={markInvoiceAsPaid.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {markInvoiceAsPaid.isPending ? 'Processando...' : 'Confirmar Pagamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de histórico de compras */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Histórico de Compras - {selectedCard?.nickname}
            </DialogTitle>
            <DialogDescription>
              Todas as compras realizadas neste cartão
            </DialogDescription>
          </DialogHeader>
          
          <CardPurchaseHistory cardId={selectedCard?.id} />
          
          <div className="flex justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsHistoryDialogOpen(false)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cards;