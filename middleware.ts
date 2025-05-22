import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

// Define protected routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/upload", "/profile", "/settings", "/subscription"]

export async function middleware(request: NextRequest) {
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

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Verify the session cookie
    await auth.verifySessionCookie(sessionCookie, true)

    // Session is valid, continue
    return NextResponse.next()
  } catch (error) {
    console.error("Invalid session in middleware:", error)

    // Session is invalid, redirect to login
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/profile/:path*", "/settings/:path*", "/subscription/:path*"],
}
