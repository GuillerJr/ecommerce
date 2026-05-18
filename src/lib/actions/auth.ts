
'use server';

import { getUserByEmail, getUserByResetTokenFromDb, getUserByVerificationToken } from '@/lib/data/auth';
import { updateUserInDb, addUserToDb } from '@/lib/data/users';
import { sendPasswordResetEmail, sendAccountVerificationEmail } from '@/lib/email.server';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import { clearSessionCookie, getCurrentUser, requireUser, setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { checkRateLimit, getClientRateLimitKey } from '@/lib/rate-limit';

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

export async function loginAction(credentials: LoginCredentials) {
    try {
        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('login', credentials.email || 'unknown'),
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: false, message: `Demasiados intentos. Inténtalo de nuevo en ${rateLimit.retryAfterSeconds} segundos.` };
        }

        if (!credentials.password) {
            return { success: false, message: 'La contraseña es requerida.' };
        }

        const userData = await getUserByEmail(credentials.email);
        if (!userData || !userData.password) {
            return { success: false, message: 'El correo electrónico o la contraseña son incorrectos.' };
        }

        const passwordMatch = await bcrypt.compare(credentials.password, userData.password);
        
        if (passwordMatch) {
            if (userData.status === 'Inactivo') {
                if (userData.verificationToken) {
                    return { success: false, message: 'Tu cuenta no ha sido verificada. Por favor, revisa tu correo.' };
                }
                return { success: false, message: 'Tu cuenta está inactiva. Contacta con soporte.' };
            }
            
            await setSessionCookie(userData);
            return { success: true, user: JSON.parse(JSON.stringify(toPublicUser(userData))) };
        } else {
            return { success: false, message: 'El correo electrónico o la contraseña son incorrectos.' };
        }
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    }
}

export async function getCurrentUserAction() {
    try {
        const user = await getCurrentUser();
        return { success: true, user: user ? JSON.parse(JSON.stringify(user)) : null };
    } catch (error) {
        return { success: false, user: null, message: 'No se pudo obtener la sesión.' };
    }
}

export async function logoutAction() {
    await clearSessionCookie();
    return { success: true };
}

export async function registerAction(credentials: RegisterCredentials) {
    try {
        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('register', credentials.email || 'unknown'),
            limit: 3,
            windowMs: 60 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: false, message: `Demasiadas solicitudes. Inténtalo de nuevo en ${rateLimit.retryAfterSeconds} segundos.` };
        }

        if (!credentials.password) {
            return { success: false, message: 'La contraseña es requerida.' };
        }
        const existingUser = await getUserByEmail(credentials.email);
        if (existingUser) {
            return { success: false, message: 'Este correo electrónico ya está en uso.' };
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 3600000).toISOString(); // 24 hours

        const hashedPassword = await bcrypt.hash(credentials.password, 10);

        await addUserToDb({
            name: credentials.name,
            email: credentials.email,
            password: hashedPassword,
            identification: credentials.identification,
            phone: credentials.phone,
            role: 'user',
            status: 'Inactivo',
            addresses: [],
            cart: [],
            verificationToken,
            verificationTokenExpires,
            recentlyViewed: [],
            permissions: {},
        });
        
        await sendAccountVerificationEmail(credentials.email, verificationToken);

        return { success: true };
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    }
}

export async function verifyEmailAction(token: string) {
    try {
        const user = await getUserByVerificationToken(token);

        if (!user) {
            return { success: false, message: 'El token de verificación no es válido o ha expirado.' };
        }

        user.status = 'Activo';
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        
        await updateUserInDb(user);
        revalidatePath('/admin/users');

        return { success: true };
    } catch (error) {
        console.error("Error verifying email:", error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    }
}

export async function requestPasswordResetAction(email: string) {
    try {
        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('password-reset-request', email || 'unknown'),
            limit: 3,
            windowMs: 60 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: true };
        }

        const user = await getUserByEmail(email);

        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
            await updateUserInDb(user);
            await sendPasswordResetEmail(email, token);
        }
        
        return { success: true };
    } catch (error) {
        console.error("Password reset error:", error);
        return { success: true };
    }
}

export async function resetPasswordAction(token: string, newPassword: string) {
    try {
        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('password-reset', token || 'unknown'),
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: false, message: `Demasiados intentos. Inténtalo de nuevo en ${rateLimit.retryAfterSeconds} segundos.` };
        }

        const user = await getUserByResetTokenFromDb(token);

        if (!user) {
            return { success: false, message: 'El enlace de restablecimiento no es válido o ha expirado.' };
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        
        await updateUserInDb(user);
        revalidatePath('/admin/users');

        return { success: true };

    } catch (error) {
        console.error("Error resetting password:", error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    }
}

export async function changePasswordAction(userId: string, currentPassword_raw: string, newPassword_raw: string) {
    try {
        const currentUser = await requireUser();
        if (currentUser.id !== userId) {
            return { success: false, message: 'No autorizado.' };
        }

        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('change-password', currentUser.id),
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: false, message: `Demasiados intentos. Inténtalo de nuevo en ${rateLimit.retryAfterSeconds} segundos.` };
        }

        const user = await getUserByEmail(currentUser.email);
        if (!user || !user.password) {
            return { success: false, message: 'Usuario no encontrado.' };
        }

        const passwordMatch = await bcrypt.compare(currentPassword_raw, user.password);

        if (!passwordMatch) {
            return { success: false, message: 'La contraseña actual es incorrecta.' };
        }

        const hashedNewPassword = await bcrypt.hash(newPassword_raw, 10);
        user.password = hashedNewPassword;
        const updatedUser = await updateUserInDb(user);

        if (updatedUser) {
            const { password, ...userToReturn } = updatedUser;
            return { success: true, user: JSON.parse(JSON.stringify(userToReturn)) };
        } else {
            return { success: false, message: 'No se pudo actualizar la contraseña.' };
        }

    } catch (error) {
        console.error("Change password error:", error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    }
}
