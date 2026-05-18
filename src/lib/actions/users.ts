

'use server';

import type { User, Address } from '@/types';
import { 
    updateUserInDb, 
    addAddressToDb, 
    updateAddressInDb,
    deleteAddressFromDb as deleteAddressFromDbInData,
    getUserById,
    addUserFromAdminToDb
} from '@/lib/data/users';
import { revalidatePath } from 'next/cache';
import { getClient } from '../db.server';
import { logActivity } from '../data/activity';
import { getRoleById } from '../data/roles';
import { requirePermission, requireUser, toPublicUser } from '@/lib/auth/session';

export async function updateUserAction(user: User, adminUserId?: string) {
    try {
        const currentUser = await requireUser();
        const oldUser = await getUserById(user.id);
        if (!oldUser) throw new Error("User not found");

        const isSelfUpdate = currentUser.id === user.id;
        if (!isSelfUpdate) {
            await requirePermission('manage_users');
        }
        
        // Ensure password is not accidentally overwritten with null/undefined
        const userDataToUpdate: User = isSelfUpdate
            ? {
                ...oldUser,
                name: user.name,
                email: user.email,
                identification: user.identification,
                phone: user.phone,
                addresses: user.addresses,
                cart: user.cart,
                recentlyViewed: user.recentlyViewed,
              }
            : { ...oldUser, ...user };
        if (!userDataToUpdate.password) {
            delete userDataToUpdate.password;
        }

        const updatedUser = await updateUserInDb(userDataToUpdate);
        
        if (!isSelfUpdate) {
            const adminUser = currentUser;
            const changes: Record<string, any> = {};
            for (const key in user) {
                const typedKey = key as keyof User;
                 if (typedKey !== 'password' && JSON.stringify(user[typedKey]) !== JSON.stringify(oldUser[typedKey])) {
                    changes[typedKey] = {
                        old: oldUser[typedKey],
                        new: user[typedKey]
                    };
                }
            }
            if (Object.keys(changes).length > 0) {
                 await logActivity({ userId: adminUser.id, userName: adminUser.name, action: 'update', entityType: 'User', entityId: user.id, details: changes });
            }
             revalidatePath('/admin/usuarios');
        }
        revalidatePath('/perfil');
        return { success: true, user: updatedUser ? toPublicUser(updatedUser) : null };
    } catch (error) {
        return { success: false, message: 'Error al actualizar usuario' };
    }
}

export async function addUserFromAdminAction(userData: { name: string; email: string; password?: string; roleId: string; status: 'Activo' | 'Inactivo' }, adminUserId: string) {
    try {
        const adminUser = await requirePermission('manage_users');
        const newUser = await addUserFromAdminToDb(userData);
        const { password, ...userToLog } = userData; // Exclude password from logs
        await logActivity({
            userId: adminUser.id,
            userName: adminUser.name,
            action: 'create',
            entityType: 'User',
            entityId: newUser.id,
            details: userToLog,
        });
        revalidatePath('/admin/usuarios');
        return { success: true, user: newUser };
    } catch (error) {
        return { success: false, message: 'El correo electrónico ya está en uso.' };
    }
}


export async function addAddressAction(userId: string, addressData: Omit<Address, 'id'>) {
    try {
        const currentUser = await requireUser();
        if (currentUser.id !== userId) return { success: false, message: 'No autorizado.' };
        const user = await addAddressToDb(userId, addressData);
        revalidatePath('/direcciones');
        revalidatePath('/checkout');
        return { success: true, user };
    } catch (error) {
        return { success: false, message: 'Error al añadir la dirección.' };
    }
}

export async function updateAddressAction(userId: string, address: Address) {
    try {
        const currentUser = await requireUser();
        if (currentUser.id !== userId) return { success: false, message: 'No autorizado.' };
        const user = await updateAddressInDb(userId, address);
        revalidatePath('/direcciones');
        revalidatePath('/checkout');
        return { success: true, user };
    } catch (error) {
        return { success: false, message: 'Error al actualizar la dirección.' };
    }
}

export async function deleteAddressAction(userId: string, addressId: string) {
    try {
        const currentUser = await requireUser();
        if (currentUser.id !== userId) return { success: false, message: 'No autorizado.' };
        const user = await deleteAddressFromDbInData(userId, addressId);
        revalidatePath('/direcciones');
        revalidatePath('/checkout');
        return { success: true, user };
    } catch (error) {
        return { success: false, message: 'Error al eliminar la dirección.' };
    }
}

export async function addRecentlyViewedProductAction(userId: string, productId: string) {
  const client = await getClient();
  try {
    const currentUser = await requireUser();
    if (currentUser.id !== userId) return { success: false, message: 'No autorizado.' };
    await client.query('BEGIN');
    const userRes = await client.query('SELECT "recentlyViewed" FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }
    const recentlyViewed: string[] = userRes.rows[0].recentlyViewed || [];
    const updatedRecentlyViewed = [productId, ...recentlyViewed.filter(id => id !== productId)].slice(0, 10);
    
    const res = await client.query('UPDATE users SET "recentlyViewed" = $1 WHERE id = $2 RETURNING *', [JSON.stringify(updatedRecentlyViewed), userId]);
    
    await client.query('COMMIT');
    const row = res.rows[0];
     if (!row) return { success: false, message: 'Failed to update user' };

    const role = await getRoleById(row.roleId);

    return {
        success: true,
        user: {
            ...row,
            role: role?.name || 'user',
        }
    };

  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, message: 'Error al añadir producto a vistos recientemente.' };
  } finally {
    client.release();
  }
}
