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
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  console.log("🔍 Middleware: Processing request for:", pathname)

  // Define route categories
  const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/login-success"]
  const publicRoutes = ["/", "/pricing", "/terms", "/privacy", "/creator", "/category"]
  const purchaseRoutes = ["/purchase-success", "/payment-success", "/success"]

  // Allow auth routes and public routes
  if (authRoutes.includes(pathname) || publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow purchase success routes (these will handle auth internally)
  if (purchaseRoutes.some((route) => pathname.startsWith(route))) {
    console.log("✅ Allowing purchase success route:", pathname)
    return NextResponse.next()
  }

  // Check for session cookie for protected routes
  const sessionCookie = request.cookies.get("session")?.value

  // If accessing dashboard without session, redirect to login
  if (pathname.startsWith("/dashboard") && !sessionCookie) {
    console.log("❌ No session found, redirecting to login")
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Allow all other routes if session exists or if not dashboard
  console.log("✅ Allowing access to:", pathname)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
