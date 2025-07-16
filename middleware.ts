import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // List of paths that don't require authentication
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/privacy",
    "/terms",
    "/pricing",
    "/api/auth",
    "/api/webhooks",
    "/api/health",
    "/purchase-success",
    "/payment-success",
    "/subscription/success",
    "/stripe-oauth-callback",
    "/creator",
    "/category",
    "/showcase",
    "/video",
    "/free-content",
    "/discover",
    "/debug-stripe-purchase", // Allow debug page in development
  ]

  // Check if the current path should be public
  const isPublicPath = publicPaths.some((path) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(path)
  })

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next()
  }

  // For protected paths, check for authentication
  const authToken = request.cookies.get("auth-token")?.value
  const sessionCookie = request.cookies.get("__session")?.value

  if (!authToken && !sessionCookie) {
    // Redirect to login for protected paths
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
