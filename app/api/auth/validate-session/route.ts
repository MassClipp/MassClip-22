import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Get the session cookie
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ valid: false, reason: "No session cookie" })
    }

    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin()
      const auth = getAuth()

      // Verify the session cookie
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true)

      return NextResponse.json({
        valid: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      })
    } catch (error) {
      console.error("Invalid session cookie:", error)
      return NextResponse.json({ valid: false, reason: "Invalid session" })
    }
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json({ valid: false, reason: "Server error" }, { status: 500 })
  }
}
