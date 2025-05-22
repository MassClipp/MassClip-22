import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET() {
  try {
    // Get session cookie
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    try {
      // Verify the session cookie
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)

      // Return success with user ID
      return NextResponse.json({
        valid: true,
        uid: decodedClaims.uid,
      })
    } catch (error) {
      console.error("Invalid session during validation:", error)
      return NextResponse.json({ valid: false }, { status: 401 })
    }
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
