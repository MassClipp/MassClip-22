import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get the ID token
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid ID token" }, { status: 401 })
    }

    // Check if the user exists
    try {
      await auth.getUser(decodedToken.uid)
    } catch (error) {
      console.error("User not found:", error)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create a session cookie
    // The session cookie will be valid for 2 weeks (14 days)
    const expiresIn = 60 * 60 * 24 * 14 * 1000 // 14 days in milliseconds
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn })

    // Set the cookie
    cookies().set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn / 1000, // Convert to seconds
      path: "/",
      sameSite: "lax",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 500 },
    )
  }
}
