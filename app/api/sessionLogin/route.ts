import { getAuth } from "firebase-admin/auth"
import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get the ID token from the request
    const { idToken } = await req.json()

    if (!idToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // Create a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn })

    // Create the response
    const res = NextResponse.json({ status: "success" })

    // Set the cookie
    res.cookies.set("session", sessionCookie, {
      maxAge: expiresIn / 1000, // Convert to seconds
      httpOnly: true,
      secure: true,
      path: "/",
    })

    return res
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: "Failed to create session", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
