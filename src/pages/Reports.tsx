import React from 'react';
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análises detalhadas das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Período
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Empty State */}
      <Card className="p-12 text-center">
        <BarChart3 className="w-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Analise suas Finanças</h2>
        <p className="text-muted-foreground mb-6">
          Adicione algumas transações para gerar relatórios detalhados sobre seus gastos.
        </p>
        <div className="flex gap-4 justify-center">
          <Button className="bg-gradient-primary hover:opacity-90">
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver Análises
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Dados
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Reports;