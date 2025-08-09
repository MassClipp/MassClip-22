import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip middleware entirely for Stripe webhooks
  if (request.nextUrl.pathname === "/api/webhooks/stripe") {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclude webhook routes from middleware processing
    "/((?!api/webhooks/stripe).*)",
  ],
}
