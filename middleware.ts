import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isAuthRoute, isProtectedRoute } from "@/lib/auth-utils"

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

  // Allow auth routes to proceed without session check
  if (isAuthRoute(pathname)) {
    return NextResponse.next()
  }

  // Only check session for protected routes
  if (isProtectedRoute(pathname)) {
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      const url = new URL("/login", request.url)
      url.searchParams.set("redirect", pathname)

      const response = NextResponse.redirect(url)
      response.headers.set("x-middleware-redirect", "auth-required")
      return response
    }
  }

  return NextResponse.next()
}

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
