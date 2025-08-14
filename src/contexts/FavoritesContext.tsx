
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface FavoritesContextType {
  favoriteIds: string[];
  toggleFavorite: (productId: string, productName: string) => void;
  isFavorite: (productId: string) => boolean;
  isFavoritesLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('favorites');
      if (storedFavorites) {
        setFavoriteIds(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error("Failed to parse favorites from localStorage", error);
      localStorage.removeItem('favorites');
    } finally {
      setIsFavoritesLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback((productId: string, productName: string) => {
    const isCurrentlyFavorite = favoriteIds.includes(productId);
    
    const newFavorites = isCurrentlyFavorite
      ? favoriteIds.filter(id => id !== productId)
      : [...favoriteIds, productId];

    setFavoriteIds(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));

    if (isCurrentlyFavorite) {
      toast({
        title: "Eliminado de favoritos",
        description: `${productName} ha sido eliminado de tus favoritos.`,
      });
    } else {
      toast({
        title: "Añadido a favoritos",
        description: `${productName} ha sido añadido a tus favoritos.`,
      });
    }
  }, [favoriteIds, toast]);

  const isFavorite = useCallback((productId: string) => {
    return favoriteIds.includes(productId);
  }, [favoriteIds]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggleFavorite, isFavorite, isFavoritesLoading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
