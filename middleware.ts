import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip body parsing for webhook routes to preserve raw body for signature verification
  if (request.nextUrl.pathname.startsWith("/api/webhooks/stripe")) {
    return NextResponse.next()
  }

  // Continue with normal middleware processing for other routes
  return NextResponse.next()
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    // Apply to all API routes
    "/api/:path*",
    // Exclude webhook routes from any body parsing middleware
    "/((?!api/webhooks/stripe).*)",
  ],
}
