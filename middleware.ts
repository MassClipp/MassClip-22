import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip any processing for Stripe webhooks to preserve raw body
  if (request.nextUrl.pathname.startsWith("/api/webhooks/stripe")) {
    // Just pass through without any modifications
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only apply to API routes
    "/api/:path*",
  ],
}
