import React from 'react';
import { ThemeProviderContext, useThemeState } from '@/hooks/useTheme';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'system', 
  storageKey = 'granafacil-theme' 
}) => {
  const themeState = useThemeState(defaultTheme, storageKey);

  return (
    <ThemeProviderContext.Provider value={themeState}>
      {children}
    </ThemeProviderContext.Provider>
  );
};