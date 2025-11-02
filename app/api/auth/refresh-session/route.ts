import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

// Session duration: 2 weeks in seconds
const SESSION_EXPIRATION = 60 * 60 * 24 * 14

export async function POST(request: NextRequest) {
  try {
    // Get the ID token from the request body
    const { idToken } = await request.json()

    if (!idToken) {
      console.error("No ID token provided for session refresh")
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    try {
      // Verify the ID token first
      const decodedToken = await auth.verifyIdToken(idToken)
      console.log(`ID token verified for user: ${decodedToken.uid} during refresh`)

      // Create a session cookie with a 2-week expiration
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRATION * 1000, // Firebase wants milliseconds
      })
      console.log("Session cookie refreshed successfully")

      // Set the session cookie with proper attributes
      cookies().set({
        name: "session",
        value: sessionCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_EXPIRATION,
        path: "/",
        sameSite: "lax",
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error refreshing session:", error)
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid ID token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error processing session refresh request:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
