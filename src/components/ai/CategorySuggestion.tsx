import React from 'react';
import { Brain, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CategorySuggestionProps {
  categoryName: string;
  confidence: number;
  reasoning: string;
  isVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

const CategorySuggestion: React.FC<CategorySuggestionProps> = ({
  categoryName,
  confidence,
  reasoning,
  isVisible,
  onAccept,
  onReject,
  onEdit,
  isLoading = false
}) => {
  if (!isVisible) return null;

  const confidenceColor = confidence >= 0.8 ? 'bg-green-500' : 
                         confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500';

  const confidenceText = confidence >= 0.8 ? 'Alta' : 
                        confidence >= 0.6 ? 'Média' : 'Baixa';

  return (
    <Card className="p-4 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-sm">IA sugeriu categoria:</h3>
            <Badge variant="outline" className={cn("text-xs", confidenceColor, "text-white")}>
              {confidenceText} ({Math.round(confidence * 100)}%)
            </Badge>
          </div>
          
          <div className="mb-2">
            <span className="font-semibold text-primary">{categoryName}</span>
          </div>
          
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {reasoning}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onAccept}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Aceitar
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={isLoading}
            >
              Editar
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Rejeitar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CategorySuggestion;