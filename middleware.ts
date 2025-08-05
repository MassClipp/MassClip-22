import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log all webhook requests for debugging
  if (pathname.startsWith("/api/webhooks/")) {
    console.log("🔍 Middleware: Webhook request detected")
    console.log("- Path:", pathname)
    console.log("- Method:", request.method)
    console.log("- Headers:", Object.fromEntries(request.headers.entries()))
    console.log("- Timestamp:", new Date().toISOString())

    // Completely bypass middleware for webhooks
    return NextResponse.next()
  }

  // Skip middleware for static files and special Next.js routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
