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

  // CRITICAL: Do not process webhook routes at all
  if (pathname === "/api/webhooks/stripe") {
    console.log("🔍 Middleware: Webhook route - passing through untouched")
    // Return immediately without any processing
    return NextResponse.next()
  }

  // Skip other API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow access to purchase success page
  if (pathname === "/purchase-success") {
    return NextResponse.next()
  }

  // TEMPORARILY DISABLE AUTH CHECKS
  console.log("🔍 Middleware: Allowing access to:", pathname)
  return NextResponse.next()
}

export const config = {
  // Exclude webhook routes from middleware entirely
  matcher: [
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
}
