import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // For Stripe webhooks, we must not modify the request in any way
  if (request.nextUrl.pathname === "/api/webhooks/stripe") {
    // Pass through completely untouched
    return NextResponse.next()
  }

  // Continue with normal processing for other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match API routes
    "/api/:path*",
  ],
}
