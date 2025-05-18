import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db, auth } from "@/lib/firebase-admin"
import { isValidUsername } from "@/lib/username-validation"

export async function POST(request: NextRequest) {
  try {
    const { idToken, username, displayName } = await request.json()

    if (!idToken) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    if (!username || !displayName) {
      return NextResponse.json({ success: false, error: "Username and display name are required" }, { status: 400 })
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          success: false,
          error: "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores",
        },
        { status: 400 },
      )
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Check if username is already taken
    const usernameSnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    if (!usernameSnapshot.empty) {
      return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 400 })
    }

    // Create creator profile
    const creatorData = {
      uid,
      username,
      displayName,
      bio: "",
      profilePic: "",
      freeClips: [],
      paidClips: [],
      createdAt: new Date().toISOString(),
    }

    // Add to creators collection
    await db.collection("creators").doc(username).set(creatorData)

    // Update user document with username
    await db.collection("users").doc(uid).set({ username, displayName }, { merge: true })

    return NextResponse.json({ success: true, username })
  } catch (error) {
    console.error("Error creating profile:", error)
    return NextResponse.json({ success: false, error: "Failed to create profile" }, { status: 500 })
  }
}
