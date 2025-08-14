
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

const MAX_COMPARISON_ITEMS = 4;

interface ComparisonContextType {
  comparisonIds: string[];
  toggleComparison: (productId: string, productName: string) => void;
  removeFromComparison: (productId: string) => void;
  isComparing: (productId: string) => boolean;
  clearComparison: () => void;
  isComparisonLoading: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export const ComparisonProvider = ({ children }: { children: ReactNode }) => {
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [isComparisonLoading, setIsComparisonLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedComparison = localStorage.getItem('comparison');
      if (storedComparison) {
        setComparisonIds(JSON.parse(storedComparison));
      }
    } catch (error) {
      console.error("Failed to parse comparison from localStorage", error);
      localStorage.removeItem('comparison');
    } finally {
      setIsComparisonLoading(false);
    }
  }, []);

  const updateLocalStorage = (ids: string[]) => {
      localStorage.setItem('comparison', JSON.stringify(ids));
  };

  const toggleComparison = useCallback((productId: string, productName: string) => {
    let newIds: string[] | undefined;
    let toastMessage: { title: string; description: string; variant?: 'destructive' } | null = null;

    setComparisonIds(prevIds => {
      const isCurrentlyComparing = prevIds.includes(productId);
      
      if (isCurrentlyComparing) {
        newIds = prevIds.filter(id => id !== productId);
        toastMessage = {
          title: "Eliminado de la comparación",
          description: `${productName} ha sido eliminado de tu lista de comparación.`,
        };
      } else {
        if (prevIds.length >= MAX_COMPARISON_ITEMS) {
          toastMessage = {
            title: "Límite de comparación alcanzado",
            description: `Solo puedes comparar hasta ${MAX_COMPARISON_ITEMS} productos a la vez.`,
            variant: 'destructive',
          };
          newIds = prevIds;
        } else {
          newIds = [...prevIds, productId];
          toastMessage = {
            title: "Añadido a la comparación",
            description: `${productName} ha sido añadido a tu lista de comparación.`,
          };
        }
      }
      
      if (newIds && JSON.stringify(newIds) !== JSON.stringify(prevIds)) {
        updateLocalStorage(newIds);
      }
      return newIds || prevIds;
    });
    
    // Call toast outside of the setState callback
    if (toastMessage) {
        toast(toastMessage);
    }
  }, [toast]);

  const removeFromComparison = useCallback((productId: string) => {
      setComparisonIds(prevIds => {
          const newIds = prevIds.filter(id => id !== productId);
          updateLocalStorage(newIds);
          return newIds;
      });
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonIds([]);
    updateLocalStorage([]);
    toast({ title: "Lista de comparación limpiada." });
  }, [toast]);

  const isComparing = useCallback((productId: string) => {
    return comparisonIds.includes(productId);
  }, [comparisonIds]);

  return (
    <ComparisonContext.Provider value={{ comparisonIds, toggleComparison, removeFromComparison, clearComparison, isComparing, isComparisonLoading }}>
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};
