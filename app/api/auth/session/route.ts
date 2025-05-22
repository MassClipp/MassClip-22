import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

// Session duration: 2 weeks in seconds
const SESSION_EXPIRATION = 60 * 60 * 24 * 14

export async function POST(request: NextRequest) {
  try {
    // Get the ID token from the request body
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Verify the ID token
    try {
      // First verify the token is valid
      const decodedToken = await auth.verifyIdToken(idToken)

      // Check that the user exists in Firebase Auth
      const user = await auth.getUser(decodedToken.uid)

      if (!user) {
        console.error(`User ${decodedToken.uid} not found in Firebase Auth`)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Create a session cookie
      const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRATION * 1000 })

      // Set the cookie
      cookies().set({
        name: "session",
        value: sessionCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_EXPIRATION,
        path: "/",
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error verifying ID token:", error)
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid ID token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
