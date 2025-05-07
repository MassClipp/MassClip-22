import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if we're in the v0.dev preview environment
  const isV0Preview = request.headers.get("host")?.includes("v0.dev")

  // Skip middleware logic in v0.dev preview
  if (isV0Preview) {
    return NextResponse.next()
  }

  // Disabled redirect logic as requested
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
