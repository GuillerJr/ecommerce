/**
 * @fileoverview Proveedor de contexto para la autenticación de usuarios.
 * Gestiona el estado del usuario (login, logout, registro), lo almacena en localStorage
 * y proporciona la información de autenticación a toda la aplicación.
 * También sincroniza el estado de la sesión entre pestañas.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { loginAction, registerAction, changePasswordAction } from '@/lib/actions/auth';
import { updateUserAction } from '@/lib/actions/users';

type LoginCredentials = {
  email: string;
  password?: string;
};

type RegisterCredentials = {
  name: string;
  email: string;
  password?: string;
  identification: string;
  phone: {
      countryCode: string;
      number: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string; }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; message?: string; }>;
  logout: () => void;
  loading: boolean;
  updateUser: (newUser: User) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (passwords: { currentPassword?: string; newPassword: string }) => Promise<{ success: boolean; message?: string }>;
  syncUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Efecto para cargar el usuario desde localStorage al iniciar la aplicación.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto para sincronizar el estado de la sesión entre pestañas.
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === USER_STORAGE_KEY) {
        try {
            if (event.newValue) {
                setUser(JSON.parse(event.newValue));
            } else {
                // Si el valor es nulo, significa que se cerró sesión en otra pestaña.
                setUser(null);
            }
        } catch (error) {
             console.error("Failed to sync user state from localStorage", error);
             setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  /**
   * Realiza el proceso de inicio de sesión.
   * @param {LoginCredentials} credentials - Credenciales del usuario.
   * @returns {Promise<{success: boolean, message?: string}>} Resultado del inicio de sesión.
   */
  const login = async (credentials: LoginCredentials) => {
    const result = await loginAction(credentials);
    if (result.success && result.user) {
      const userString = JSON.stringify(result.user);
      localStorage.setItem(USER_STORAGE_KEY, userString);
      setUser(result.user);
    }
    return { success: result.success, message: result.message };
  };
  
  /**
   * Realiza el proceso de registro de un nuevo usuario.
   * @param {RegisterCredentials} credentials - Datos del nuevo usuario.
   * @returns {Promise<{success: boolean, message?: string}>} Resultado del registro.
   */
  const register = async (credentials: RegisterCredentials) => {
    return await registerAction(credentials);
  };
  
  /**
   * Cierra la sesión del usuario actual.
   */
  const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    router.push('/login');
  };
  
  /**
   * Actualiza los datos del usuario en la sesión y en la base de datos.
   * @param {User} newUser - El objeto del usuario con los datos actualizados.
   * @returns {Promise<{success: boolean, message?: string}>} Resultado de la actualización.
   */
  const updateUser = async (newUser: User) => {
    const result = await updateUserAction(newUser);
    if (result.success && result.user) {
        syncUser(result.user);
    }
    return { success: !!result.success, message: result.message };
  };
  
  /**
   * Cambia la contraseña del usuario actual.
   * @param {{ currentPassword?: string; newPassword: string }} passwords - Contraseña actual y nueva.
   * @returns {Promise<{success: boolean, message?: string}>} Resultado del cambio de contraseña.
   */
  const updatePassword = async (passwords: { currentPassword?: string; newPassword: string; }) => {
    if (!user) return { success: false, message: 'No has iniciado sesión.' };
    
    if (!passwords.currentPassword || !passwords.newPassword) {
        return { success: false, message: 'Se requieren ambas contraseñas.' };
    }

    const result = await changePasswordAction(user.id, passwords.currentPassword, passwords.newPassword);
    
    if (result.success && result.user) {
        syncUser(result.user);
    }
    
    return { success: result.success, message: result.message };
  };
  
  /**
   * Sincroniza el estado del usuario en el contexto y en el almacenamiento.
   * @param {User} newUser - El nuevo objeto de usuario.
   */
  const syncUser = (newUser: User) => {
    const userString = JSON.stringify(newUser);
    localStorage.setItem(USER_STORAGE_KEY, userString);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, updatePassword, syncUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

/**
 * Hook personalizado para acceder al contexto de autenticación.
 * @returns {AuthContextType} El contexto de autenticación.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
