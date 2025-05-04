import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get hostname (e.g. vercel.com, test.vercel.app, etc.)
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()

  // Log the hostname for debugging
  console.log(`Middleware processing request for: ${hostname}`)

  // IMPORTANT: Disable the redirect logic to allow both domains to work independently
  // This allows masscliptest.vercel.app and massclip.pro to function without redirects

  // Just pass through all requests without modification
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
