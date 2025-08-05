import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // For Stripe webhooks, we absolutely must not modify the request
  if (request.nextUrl.pathname === "/api/webhooks/stripe") {
    // Pass through with no modifications whatsoever
    const response = NextResponse.next()

    // Add a header to confirm middleware processed this
    response.headers.set("x-middleware-processed", "true")

    return response
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
