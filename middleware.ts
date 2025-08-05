import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and special Next.js routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // CRITICAL: Completely bypass middleware for webhook routes
  if (pathname.startsWith("/api/webhooks/")) {
    console.log("🔍 Middleware: Webhook route detected - bypassing all processing")
    return NextResponse.next()
  }

  // Skip other API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow public access to purchase success page
  if (pathname === "/purchase-success") {
    return NextResponse.next()
  }

  // TEMPORARILY DISABLE AUTH CHECKS
  console.log("🔍 Middleware: Allowing access to:", pathname)
  return NextResponse.next()
}

export const config = {
  // Completely exclude webhook routes from middleware
  matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)"],
}
