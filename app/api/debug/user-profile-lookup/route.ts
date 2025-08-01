import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  console.log("🔍 [User Profile Lookup] Starting user profile lookup")

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken, uid } = body

    console.log("🔍 [User Profile Lookup] Request data:", {
      hasIdToken: !!idToken,
      providedUid: uid,
      idTokenLength: idToken?.length,
    })

    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    // Verify token first
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [User Profile Lookup] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [User Profile Lookup] Token verification failed:", error)
      return NextResponse.json({ error: "Token verification failed", details: error.message }, { status: 401 })
    }

    // Use UID from token (more secure than trusting client-provided UID)
    const userUid = decodedToken.uid

    console.log("🔍 [User Profile Lookup] Looking up user profile for:", userUid)

    // Look up user profile in Firestore
    try {
      const userDoc = await db.collection("users").doc(userUid).get()

      let profileData = null
      if (userDoc.exists) {
        profileData = userDoc.data()
        console.log("✅ [User Profile Lookup] User profile found")
      } else {
        console.log("⚠️ [User Profile Lookup] User profile not found in Firestore")
      }

      // Also get Firebase Auth user record
      let authUserRecord = null
      try {
        authUserRecord = await auth.getUser(userUid)
        console.log("✅ [User Profile Lookup] Firebase Auth user record found")
      } catch (authError: any) {
        console.error("❌ [User Profile Lookup] Failed to get Auth user record:", authError)
      }

      return NextResponse.json({
        success: true,
        userUid,
        tokenValid: true,
        profile: {
          exists: userDoc.exists,
          data: profileData,
          docId: userDoc.id,
        },
        authRecord: authUserRecord
          ? {
              uid: authUserRecord.uid,
              email: authUserRecord.email,
              emailVerified: authUserRecord.emailVerified,
              displayName: authUserRecord.displayName,
              photoURL: authUserRecord.photoURL,
              disabled: authUserRecord.disabled,
              metadata: {
                creationTime: authUserRecord.metadata.creationTime,
                lastSignInTime: authUserRecord.metadata.lastSignInTime,
                lastRefreshTime: authUserRecord.metadata.lastRefreshTime,
              },
              providerData: authUserRecord.providerData,
            }
          : null,
        serverInfo: {
          timestamp: new Date().toISOString(),
          firestoreConnected: true,
        },
      })
    } catch (firestoreError: any) {
      console.error("❌ [User Profile Lookup] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Firestore lookup failed",
          details: firestoreError.message,
          userUid,
          tokenValid: true,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [User Profile Lookup] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
