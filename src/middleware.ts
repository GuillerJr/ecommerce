import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'session';

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  return process.env.NODE_ENV === 'production' ? null : 'development-only-session-secret-change-me';
}

function base64urlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function bytesToBase64url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(payload: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToBase64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

async function verifyAdminSession(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return false;
  const expectedSignature = await sign(payload);
  if (!expectedSignature || expectedSignature !== signature) return false;

  try {
    const session = JSON.parse(new TextDecoder().decode(base64urlToBytes(payload)));
    if (!session.userId || !session.expiresAt || session.expiresAt < Date.now()) return false;
    return session.role !== 'user' || session.permissions?.all === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/torneos') || request.nextUrl.pathname.startsWith('/admin/torneos')) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith('/admin') ? '/admin/dashboard' : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isAdmin = await verifyAdminSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/torneos/:path*'],
};
