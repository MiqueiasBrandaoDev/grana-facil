import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  gradient?: 'primary' | 'success' | 'accent' | 'card';
  className?: string;
}

const FinancialCard: React.FC<FinancialCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  gradient = 'card',
  className
}) => {
  const gradientClasses = {
    primary: 'bg-gradient-primary',
    success: 'bg-gradient-success',
    accent: 'bg-gradient-accent',
    card: 'bg-gradient-card'
  };

  const changeClasses = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  return (
    <div className={cn(
      "p-4 sm:p-6 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md",
      gradientClasses[gradient],
      gradient === 'primary' || gradient === 'success' ? 'border-transparent text-white' : 'border-border',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            gradient === 'primary' || gradient === 'success' 
              ? 'text-white/80' 
              : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            "text-xl sm:text-2xl font-bold",
            gradient === 'primary' || gradient === 'success' 
              ? 'text-white' 
              : 'text-foreground'
          )}>
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs font-medium",
              gradient === 'primary' || gradient === 'success' 
                ? 'text-white/70' 
                : changeClasses[changeType]
            )}>
              {change}
            </p>
          )}
        </div>
        
        <div className={cn(
          "p-2 sm:p-3 rounded-lg",
          gradient === 'primary' || gradient === 'success' 
            ? 'bg-white/20' 
            : 'bg-accent'
        )}>
          <Icon className={cn(
            "w-5 h-5 sm:w-6 sm:h-6",
            gradient === 'primary' || gradient === 'success' 
              ? 'text-white' 
              : 'text-primary'
          )} />
        </div>
      </div>
    </div>
  );
};

export default FinancialCard;