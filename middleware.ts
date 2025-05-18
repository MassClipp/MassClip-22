import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

// Paths that require authentication
const authRequiredPaths = ["/dashboard", "/setup-profile"]

// Paths that require profile setup
const profileSetupRequiredPaths = ["/dashboard"]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for API routes and static files
  if (path.startsWith("/_next") || path.startsWith("/api") || path.startsWith("/static") || path.includes(".")) {
    return NextResponse.next()
  }

  // Get the session cookie
  const sessionCookie = request.cookies.get("session")?.value

  // If no session and path requires auth, redirect to login
  if (!sessionCookie && authRequiredPaths.some((p) => path.startsWith(p))) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", path)
    return NextResponse.redirect(url)
  }

  // If session exists and path requires profile setup, check if profile is set up
  if (sessionCookie && profileSetupRequiredPaths.some((p) => path.startsWith(p))) {
    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin()

      // Verify the session cookie
      const decodedClaims = await (await import("firebase-admin/auth")).getAuth().verifySessionCookie(sessionCookie)
      const uid = decodedClaims.uid

      // Check if user has set up profile
      const userDoc = await db.collection("users").doc(uid).get()
      const userData = userDoc.data()

      if (!userData?.hasSetupProfile) {
        // User hasn't set up profile, redirect to setup page
        return NextResponse.redirect(new URL("/setup-profile", request.url))
      }
    } catch (error) {
      console.error("Error in middleware:", error)
      // Session invalid, redirect to login
      const url = new URL("/login", request.url)
      url.searchParams.set("redirect", path)
      return NextResponse.redirect(url)
    }
  }

  // If user is logged in and tries to access login/signup pages, redirect to dashboard
  if (sessionCookie && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
