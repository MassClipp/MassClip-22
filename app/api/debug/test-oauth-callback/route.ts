import { NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const { userId, idToken } = await request.json()

    if (!userId || !idToken) {
      return NextResponse.json({ error: "userId and idToken required" }, { status: 400 })
    }

    // Test Firebase token verification
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("Token verified successfully:", decodedToken.uid)
    } catch (tokenError: any) {
      console.error("Token verification failed:", tokenError)
      return NextResponse.json(
        {
          error: "Firebase token verification failed",
          details: tokenError.message,
          code: tokenError.code,
        },
        { status: 401 },
      )
    }

    // Test user document access
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    return NextResponse.json({
      success: true,
      message: "OAuth callback test passed",
      tokenValid: true,
      userExists: userDoc.exists,
      userData: userData ? { ...userData, createdAt: userData.createdAt?.toDate?.() } : null,
    })
  } catch (error: any) {
    console.error("OAuth callback test error:", error)
    return NextResponse.json(
      {
        error: "OAuth callback test failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
