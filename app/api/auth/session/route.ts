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
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    // Initialize Firebase Admin if not already initialized
    initializeFirebaseAdmin()

    // Create a session cookie using the ID token
    const auth = getAuth()
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRATION * 1000, // Firebase wants milliseconds
    })

    // Set the session cookie
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
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 401 },
    )
  }
}
