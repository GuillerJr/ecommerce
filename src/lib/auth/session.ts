import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/data/users';
import type { Permission, User } from '@/types';

const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  role: string;
  permissions?: Record<string, boolean | undefined>;
  expiresAt: number;
};

export type PublicUser = Omit<User, 'password' | 'resetPasswordToken' | 'resetPasswordExpires' | 'verificationToken' | 'verificationTokenExpires'>;

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production.');
  }
  return 'development-only-session-secret-change-me';
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function createSessionValue(payload: SessionPayload) {
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseSessionValue(value?: string): SessionPayload | null {
  if (!value) return null;
  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.userId || !payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function toPublicUser(user: User): PublicUser {
  const {
    password,
    resetPasswordToken,
    resetPasswordExpires,
    verificationToken,
    verificationTokenExpires,
    ...publicUser
  } = user;
  return publicUser;
}

export async function setSessionCookie(user: Pick<User, 'id' | 'role' | 'permissions'>) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, createSessionValue({ userId: user.id, role: user.role, permissions: user.permissions, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const payload = parseSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const user = await getUserById(payload.userId);
  if (!user || user.status !== 'Activo') return null;
  return toPublicUser(user);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado.');
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role === 'user' && !user.permissions?.all) {
    throw new Error('No autorizado.');
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<PublicUser> {
  const user = await requireAdmin();
  if (!user.permissions?.all && !user.permissions?.[permission]) {
    throw new Error('No autorizado.');
  }
  return user;
}
