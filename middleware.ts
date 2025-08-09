import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip middleware entirely for the Stripe webhook handler
  if (request.nextUrl.pathname === "/api/webhook-handler") {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclude webhook route from middleware processing
    "/((?!api/webhook-handler).*)",
  ],
}
