import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // For Stripe webhook routes, we need to preserve the raw body
  // Don't apply any middleware that might parse or modify the body
  if (request.nextUrl.pathname === "/api/webhooks/stripe") {
    // Create a new response that preserves the original request
    const response = NextResponse.next()

    // Add headers to help with debugging
    response.headers.set("x-webhook-route", "true")

    return response
  }

  // Continue with normal middleware processing for other routes
  return NextResponse.next()
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // But specifically handle webhook routes differently
    "/api/webhooks/:path*",
  ],
}
