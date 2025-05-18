import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Verify the session cookie
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Check if user has set up profile
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    return NextResponse.json({
      hasSetupProfile: userData?.hasSetupProfile || false,
    })
  } catch (error) {
    console.error("Error checking profile setup:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
