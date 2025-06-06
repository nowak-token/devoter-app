import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedPaths = ['/dashboard']; // Add any other paths that need protection

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (the public home page, if you want it unprotected)
     * - /auth (authentication related pages if any)
     *
     * This regex is a good starting point for protecting most of your app
     * while leaving essential Next.js and API routes accessible.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
    // Explicitly list protected routes or use a pattern.
    // For this task, we are using the `protectedPaths` array above and checking within the middleware.
    // If you prefer to only run middleware on specific paths, adjust the matcher.
    // For example, to only run on /dashboard and its sub-paths:
    // '/dashboard/:path*',
  ],
};
