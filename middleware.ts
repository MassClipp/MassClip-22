import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // DISABLED REDIRECT LOGIC
  // We're now allowing access to both domains without redirects
  // This allows massclip.pro and masscliptest.vercel.app to be accessed independently

  console.log("Middleware running, no redirects applied")

  // Continue with the request without redirecting
  return NextResponse.next()
}

// Only run the middleware on specific paths
export const config = {
  matcher: [
    // Match all paths except for API routes, static files, etc.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
