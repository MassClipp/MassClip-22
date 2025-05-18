import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { validateUsername } from "@/lib/username-validation"

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get the session cookie
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await (await import("firebase-admin/auth")).getAuth().verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Get request body
    const body = await request.json()
    const { username, displayName, bio } = body

    // Validate username
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    // Check if username is unique
    const creatorsRef = db.collection("creators")
    const snapshot = await creatorsRef.where("username", "==", username.toLowerCase()).limit(1).get()

    if (!snapshot.empty) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 })
    }

    // Create creator document
    await creatorsRef.doc(uid).set({
      uid,
      username: username.toLowerCase(),
      displayName: displayName || username,
      bio: bio || "",
      profilePic: decodedClaims.picture || "",
      freeClips: [],
      paidClips: [],
      createdAt: new Date(),
    })

    // Update user document to mark profile as set up
    await db.collection("users").doc(uid).set(
      {
        hasSetupProfile: true,
        username: username.toLowerCase(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting up profile:", error)
    return NextResponse.json({ error: "Failed to set up profile" }, { status: 500 })
  }
}
