
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { CartItem, Product, Customization, Discount, User } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from './AuthContext';
import { updateUserAction } from '@/lib/actions/users';
import { getDiscountsAction } from '@/lib/actions/discounts';
import { calculateDiscountedPrice } from '@/lib/utils';

const PATCH_PRICE = 5;
const NAME_NUMBER_PRICE = 5;

interface ComboItem {
    product: Product;
    quantity: number;
    customization: Customization;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number, customization: Customization) => void;
  addComboToCart: (items: ComboItem[], comboPrice: number, comboName: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const [allDiscounts, setAllDiscounts] = useState<Discount[]>([]);
  
  const { user, syncUser } = useAuth();
  const [isCartInitialized, setIsCartInitialized] = useState(false);

  useEffect(() => {
    getDiscountsAction().then(result => {
        if (result.success && result.discounts) {
            setAllDiscounts(result.discounts);
        }
    });
  }, []);

  // Load cart from user object on login, or clear on logout
  useEffect(() => {
    if (user && !isCartInitialized) {
      setCartItems(user.cart || []);
      setIsCartInitialized(true);
    } else if (!user && isCartInitialized) {
      setCartItems([]);
      setIsCartInitialized(false);
    }
  }, [user, isCartInitialized]);

  // Save cart on change (debounced)
  useEffect(() => {
    if (!isCartInitialized || !user) return;

    const handler = setTimeout(() => {
      // Avoid updating if the cart hasn't changed from what's stored
      if (JSON.stringify(user.cart || []) === JSON.stringify(cartItems)) {
        return;
      }
      
      const updatedUser: User = { ...user, cart: cartItems };
      updateUserAction(updatedUser).then(result => {
        if (result.success && result.user) {
          syncUser(result.user);
        }
      });
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cartItems), isCartInitialized, user, syncUser]);


  const addToCart = (product: Product, quantity: number = 1, customization: Customization) => {
    const cartItemId = `${product.id}-${customization.size || ''}-${customization.patches ? 'p' : ''}-${customization.nameAndNumber ? 'n' : ''}-${customization.notes || ''}`;
    
    const discountInfo = calculateDiscountedPrice(product, allDiscounts);
    let priceToAdd = discountInfo?.finalPrice ?? product.price;

    if (customization.patches) priceToAdd += PATCH_PRICE;
    if (customization.nameAndNumber) priceToAdd += NAME_NUMBER_PRICE;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === cartItemId);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { id: cartItemId, product, quantity, price: priceToAdd, customization }];
    });
    toast({
      title: "Añadido al carrito",
      description: `Se ha añadido ${product.name} a tu carrito.`,
    });
  };

  const addComboToCart = (items: ComboItem[], comboPrice: number, comboName: string) => {
      let totalOriginalPrice = 0;
      const itemsWithCustomPrice = items.map(item => {
          let customPrice = 0;
          if (item.customization.patches) customPrice += PATCH_PRICE;
          if (item.customization.nameAndNumber) customPrice += NAME_NUMBER_PRICE;
          totalOriginalPrice += item.product.price + customPrice;
          return { ...item, customPrice };
      });
      
      const priceRatio = comboPrice / totalOriginalPrice;

      const newCartItems: CartItem[] = itemsWithCustomPrice.map(({product, quantity, customization, customPrice}) => {
          const originalItemPrice = product.price + customPrice;
          const finalPrice = originalItemPrice * priceRatio;
          
          const cartItemId = `${product.id}-${customization.size || ''}-${customization.patches ? 'p' : ''}-${customization.nameAndNumber ? 'n' : ''}-${customization.notes || ''}`;

          return { id: cartItemId, product, quantity, price: finalPrice, customization };
      });

      setCartItems(prevItems => {
        const updatedItems = [...prevItems];
        newCartItems.forEach(newItem => {
            const existingItemIndex = updatedItems.findIndex(item => item.id === newItem.id);
            if(existingItemIndex !== -1) {
                updatedItems[existingItemIndex].quantity += newItem.quantity;
            } else {
                updatedItems.push(newItem);
            }
        });
        return updatedItems;
      });

      toast({
        title: "Combo añadido al carrito",
        description: `La oferta "${comboName}" está en tu carrito.`,
      });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === cartItemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addComboToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
