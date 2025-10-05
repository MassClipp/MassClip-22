import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

// Session duration: 2 weeks in seconds
const SESSION_EXPIRATION = 60 * 60 * 24 * 14

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/auth/session - Checking session cookie")

    // Get the session cookie
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session")?.value

    console.log("[v0] Session cookie exists:", !!sessionCookie)
    console.log("[v0] Session cookie length:", sessionCookie?.length || 0)

    if (!sessionCookie) {
      console.log("[v0] No session cookie found, returning null user")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    try {
      // Verify the session cookie
      console.log("[v0] Attempting to verify session cookie...")
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
      console.log("[v0] Session cookie verified successfully for user:", decodedToken.uid)

      return NextResponse.json(
        {
          user: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
          },
        },
        { status: 200 },
      )
    } catch (error) {
      console.error("[v0] Invalid session cookie:", error)
      // Clear the invalid cookie
      cookieStore.delete("session")
      return NextResponse.json({ user: null }, { status: 200 })
    }
  } catch (error) {
    console.error("[v0] Error verifying session:", error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] POST /api/auth/session - Creating session cookie")

    // Get the ID token from the request body
    const { idToken } = await request.json()

    if (!idToken) {
      console.error("[v0] No ID token provided")
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    console.log("[v0] ID token received, length:", idToken.length)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    try {
      // Verify the ID token first
      console.log("[v0] Verifying ID token...")
      const decodedToken = await auth.verifyIdToken(idToken)
      console.log(`[v0] ID token verified for user: ${decodedToken.uid}`)

      // Create a session cookie with a 2-week expiration
      console.log("[v0] Creating session cookie...")
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRATION * 1000, // Firebase wants milliseconds
      })
      console.log("[v0] Session cookie created, length:", sessionCookie.length)

      // Create response with session cookie
      const response = NextResponse.json({ success: true })

      // Set the session cookie using response.cookies
      response.cookies.set({
        name: "session",
        value: sessionCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_EXPIRATION,
        path: "/",
        sameSite: "lax",
      })

      console.log("[v0] Session cookie set in response headers")

      return response
    } catch (error) {
      console.error("[v0] Error creating session:", error)
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid ID token" }, { status: 401 })
    }
  } catch (error) {
    console.error("[v0] Error processing session request:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
