import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/upload", "/profile", "/settings", "/subscription"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and special Next.js routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Check if the path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  // If it's not a protected route, continue
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get the session cookie
  const sessionCookie = request.cookies.get("session")?.value

  // If there's no session cookie, redirect to login
  if (!sessionCookie) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)

    console.log(`Middleware: No session cookie found, redirecting to login with redirect=${pathname}`)

    return NextResponse.redirect(url)
  }

  console.log(`Middleware: Session cookie found, allowing access to ${pathname}`)

  // We can't verify the session cookie in middleware because firebase-admin
  // can't run at the edge. We'll rely on the API routes to verify the session.
  return NextResponse.next()
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
