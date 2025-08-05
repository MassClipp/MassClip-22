import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // For Stripe webhooks, completely bypass any middleware processing
  if (request.nextUrl.pathname === "/api/webhooks/stripe") {
    // Return immediately without any processing
    return NextResponse.next()
  }

  // Continue with normal processing for other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match API routes, but exclude webhook routes from processing
    "/api/((?!webhooks/stripe).)*",
  ],
}
