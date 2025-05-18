import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { validateUsername } from "@/lib/username-validation"

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { username, displayName, bio } = await request.json()

    // Validate username
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    // Check if username already exists
    const snapshot = await db.collection("creators").where("username", "==", username).limit(1).get()
    if (!snapshot.empty) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 })
    }

    // Create creator document
    await db
      .collection("creators")
      .doc(uid)
      .set({
        uid,
        username,
        displayName: displayName || "",
        bio: bio || "",
        profilePic: "",
        freeClips: [],
        paidClips: [],
        createdAt: new Date(),
      })

    // Update user document to mark profile as set up
    await db.collection("users").doc(uid).update({
      hasSetupProfile: true,
      username,
    })

    return NextResponse.json({ success: true, username })
  } catch (error) {
    console.error("Error setting up profile:", error)
    return NextResponse.json({ error: "Failed to set up profile" }, { status: 500 })
  }
}
