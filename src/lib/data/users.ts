

'use server';

import type { User, Address } from '@/types';
import { query } from '@/lib/db.server';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db.server';
import { getRoleById } from './roles';
import bcrypt from 'bcrypt';

export async function getUsers(): Promise<User[]> {
    const result = await query<any>('SELECT u.*, r.name as role_name, r.permissions as role_permissions FROM users u LEFT JOIN roles r ON u."roleId" = r.id ORDER BY u.name');
    return result.map(row => ({
        ...row,
        role: row.role_name || 'user',
        permissions: row.permissions || row.role_permissions || {},
    }));
}

export async function getUserById(id: string): Promise<User | null> {
    const result = await query<any>('SELECT u.*, r.name as role_name, r.permissions as role_permissions FROM users u LEFT JOIN roles r ON u."roleId" = r.id WHERE u.id = $1', [id]);
    const row = result[0];
    if (!row) return null;
    return {
        ...row,
        role: row.role_name || 'user',
        permissions: row.permissions || row.role_permissions || {},
    };
}

export async function addUserToDb(userData: Omit<User, 'id'>): Promise<User> {
    const { name, email, password, identification, phone, status, addresses, cart, verificationToken, verificationTokenExpires } = userData;
    const defaultRoleRes = await query<{id: string}>("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
    const roleId = defaultRoleRes[0].id;
    const queryText = 'INSERT INTO users (name, email, password, identification, phone, "roleId", status, addresses, cart, "verificationToken", "verificationTokenExpires") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *';
    const values = [name, email, password, identification, phone, roleId, status, JSON.stringify(addresses || []), JSON.stringify(cart || []), verificationToken, verificationTokenExpires];
    const result = await query<any>(queryText, values);
    const row = result[0];
    return {
        ...row,
        role: row.role_name || 'user',
    };
}

export async function addUserFromAdminToDb(userData: { name: string; email: string; password?: string; roleId: string; status: 'Activo' | 'Inactivo' }): Promise<User> {
    const { name, email, password, roleId, status } = userData;
    const hashedPassword = await bcrypt.hash(password!, 10);
    const queryText = 'INSERT INTO users (name, email, password, "roleId", status) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [name, email, hashedPassword, roleId, status];
    const result = await query<any>(queryText, values);
    const row = result[0];
    const role = await getRoleById(row.roleId);
    return {
        ...row,
        role: role?.name || 'user',
    };
}

export async function updateUserInDb(user: User): Promise<User | null> {
    const { id, name, email, password, identification, phone, roleId, status, addresses, cart, resetPasswordToken, resetPasswordExpires, verificationToken, verificationTokenExpires, recentlyViewed } = user;
    
    // Base query and params, excluding password
    const client = await getClient();
    try {
        await client.query('BEGIN');
        
        const role = await client.query('SELECT permissions FROM roles WHERE id = $1', [roleId]);
        const permissions = role.rows[0]?.permissions || {};

        let queryFields = [
            'name = $1', 'email = $2', 'identification = $3', 'phone = $4', '"roleId" = $5', 
            'status = $6', 'addresses = $7', 'cart = $8', '"resetPasswordToken" = $9', 
            '"resetPasswordExpires" = $10', '"verificationToken" = $11', '"verificationTokenExpires" = $12', 
            '"recentlyViewed" = $13', 'permissions = $14'
        ];
        let values: any[] = [
            name, email, identification, phone, roleId, status,
            JSON.stringify(addresses || []), JSON.stringify(cart || []), resetPasswordToken, 
            resetPasswordExpires, verificationToken, verificationTokenExpires, 
            JSON.stringify(recentlyViewed || []), JSON.stringify(permissions || {})
        ];

        // If a new password is provided, add it to the query
        if (password) {
            queryFields.push('password = $' + (values.length + 1));
            values.push(password);
        }
        
        values.push(id);
        const queryText = `UPDATE users SET ${queryFields.join(', ')} WHERE id = $${values.length} RETURNING *`;
        
        const result = await client.query<any>(queryText, values);
        
        await client.query('COMMIT');
        
        const row = result.rows[0];
        if (!row) return null;
        
        const updatedRole = await getRoleById(row.roleId);
        return {
            ...row,
            role: updatedRole?.name || 'user',
            permissions: row.permissions || {},
        };
    } catch(e) {
        await client.query('ROLLBACK');
        console.error("Error in updateUserInDb:", e);
        throw e;
    } finally {
        client.release();
    }
}


export async function deleteUserFromDb(id: string): Promise<void> {
    await query("UPDATE users SET status = 'Inactivo' WHERE id = $1", [id]);
}

export async function addAddressToDb(userId: string, addressData: Omit<Address, 'id'>): Promise<User | null> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const addresses: Address[] = user.addresses || [];
        if (addressData.isDefault) {
            addresses.forEach(addr => addr.isDefault = false);
        }
        const newAddress: Address = { ...addressData, id: uuidv4() };
        addresses.push(newAddress);
        
        const res = await client.query('UPDATE users SET addresses = $1 WHERE id = $2 RETURNING *', [JSON.stringify(addresses), userId]);
        await client.query('COMMIT');
        const row = res.rows[0];
        const role = await getRoleById(row.roleId);
        return {
            ...row,
            role: role?.name || 'user',
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function updateAddressInDb(userId: string, updatedAddress: Address): Promise<User | null> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        let addresses: Address[] = user.addresses || [];
        if (updatedAddress.isDefault) {
            addresses.forEach(addr => addr.isDefault = false);
        }
        addresses = addresses.map(addr => addr.id === updatedAddress.id ? updatedAddress : addr);
        
        const res = await client.query('UPDATE users SET addresses = $1 WHERE id = $2 RETURNING *', [JSON.stringify(addresses), userId]);
        await client.query('COMMIT');
        const row = res.rows[0];
        const role = await getRoleById(row.roleId);
        return {
            ...row,
            role: role?.name || 'user',
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function deleteAddressFromDb(userId: string, addressId: string): Promise<User | null> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        let addresses: Address[] = user.addresses || [];
        const initialLength = addresses.length;
        addresses = addresses.filter(addr => addr.id !== addressId);

        if (addresses.length === initialLength) {
            // No address was removed, maybe it didn't exist
            await client.query('ROLLBACK');
            return user;
        }

        // If the deleted address was the default, make the first one the new default
        const wasDefault = user.addresses.find((a: Address) => a.id === addressId)?.isDefault;
        if (wasDefault && addresses.length > 0) {
            addresses[0].isDefault = true;
        }

        const res = await client.query('UPDATE users SET addresses = $1 WHERE id = $2 RETURNING *', [JSON.stringify(addresses), userId]);
        await client.query('COMMIT');
        const row = res.rows[0];
        const role = await getRoleById(row.roleId);
        return {
            ...row,
            role: role?.name || 'user',
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function addRecentlyViewedProductAction(userId: string, productId: string) {
  const client = await getClient();
  try {
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
