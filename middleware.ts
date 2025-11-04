import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/api/webhooks/stripe" ||
    request.nextUrl.pathname.startsWith("/api/webhook-handler")
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/webhooks/stripe", "/api/webhook-handler*"],
}
