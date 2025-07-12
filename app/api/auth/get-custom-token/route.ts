import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session found" }, { status: 401 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    try {
      // Verify the session cookie
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
      console.log(`Creating custom token for user: ${decodedToken.uid}`)

      // Create a custom token for the user
      const customToken = await auth.createCustomToken(decodedToken.uid)

      return NextResponse.json({
        customToken,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
        },
      })
    } catch (error) {
      console.error("Invalid session cookie:", error)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error creating custom token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
