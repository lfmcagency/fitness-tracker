import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Define paths that require authentication
  const protectedPaths = ['/dashboard', '/training', '/nutrition', '/routine'];
  
  // Check if the current path requires authentication
  const isProtectedPath = protectedPaths.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (isProtectedPath) {
    // Get the Next.js auth session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret-key",
    });

    // Redirect to login if not authenticated
    if (!token) {
      // Store the current URL to redirect back after login
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/training/:path*',
    '/nutrition/:path*',
    '/routine/:path*',
    // Also protect the base paths
    '/dashboard',
    '/training',
    '/nutrition',
    '/routine',
  ],
};