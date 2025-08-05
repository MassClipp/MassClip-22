import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Completely skip middleware for Stripe webhooks
  if (request.nextUrl.pathname === "/api/webhooks/stripe") {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // Exclude webhook routes entirely from middleware processing
  matcher: ["/((?!api/webhooks/stripe).*)"],
}
