/**
 * @fileoverview Proveedor de contexto para la autenticación de usuarios.
 * Gestiona el estado visual del usuario y sincroniza la sesión validada por el servidor.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { loginAction, registerAction, changePasswordAction, getCurrentUserAction, logoutAction } from '@/lib/actions/auth';
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
  logout: () => Promise<void>;
  loading: boolean;
  updateUser: (newUser: User) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (passwords: { currentPassword?: string; newPassword: string }) => Promise<{ success: boolean; message?: string }>;
  syncUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Carga la sesión validada por el servidor. localStorage no es una fuente confiable de identidad.
  useEffect(() => {
    getCurrentUserAction()
      .then(result => setUser(result.user || null))
      .finally(() => setLoading(false));
  }, []);


  /**
   * Realiza el proceso de inicio de sesión.
   * @param {LoginCredentials} credentials - Credenciales del usuario.
   * @returns {Promise<{success: boolean, message?: string}>} Resultado del inicio de sesión.
   */
  const login = async (credentials: LoginCredentials) => {
    const result = await loginAction(credentials);
    if (result.success && result.user) {
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
  const logout = async () => {
    await logoutAction();
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
   * Sincroniza el estado del usuario en el contexto.
   * @param {User} newUser - El nuevo objeto de usuario.
   */
  const syncUser = (newUser: User) => {
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
