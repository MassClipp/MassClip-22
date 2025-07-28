import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and special Next.js routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/purchase-success" // Allow anonymous access to purchase success page
  ) {
    return NextResponse.next()
  }

  // TEMPORARILY DISABLE AUTH CHECKS - just log and allow everything
  console.log("🔍 Middleware: Allowing access to:", pathname)
  return NextResponse.next()

  // TODO: Re-enable auth checks once redirect is working
  /*
  const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/login-success"]
  const publicRoutes = ["/", "/pricing", "/terms", "/privacy", "/purchase-success"]

  if (authRoutes.includes(pathname) || publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get("session")?.value

  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
  */
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
