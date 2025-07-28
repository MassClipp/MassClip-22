import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log("🔍 [Middleware] Request to:", pathname)

  // Skip middleware for static files, API routes, and special Next.js routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/purchase-success" // Allow anonymous access to purchase success page
  ) {
    console.log("🔍 [Middleware] Skipping middleware for:", pathname)
    return NextResponse.next()
  }

  // COMPLETELY DISABLE AUTH CHECKS - just log and allow everything
  console.log("🔍 [Middleware] Allowing access to:", pathname)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
