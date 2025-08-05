import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip middleware entirely for webhook routes
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    console.log("🚫 Skipping middleware for webhook:", request.nextUrl.pathname)
    return NextResponse.next()
  }

  // Your existing middleware logic here
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/webhooks (webhook routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
}
