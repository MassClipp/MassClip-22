import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/upload", "/profile", "/settings", "/subscription"]

export function middleware(request: NextRequest) {
  // Check if the path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route))

  // If it's not a protected route, continue
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get the session cookie
  const sessionCookie = request.cookies.get("session")?.value

  // If there's no session cookie, redirect to login
  if (!sessionCookie) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // We can't verify the session cookie in middleware because firebase-admin
  // can't run at the edge. We'll rely on the API routes to verify the session.
  return NextResponse.next()
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/profile/:path*", "/settings/:path*", "/subscription/:path*"],
}
