import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { validateUsername } from "@/lib/username-validation"

export async function POST(request: Request) {
  try {
    const { username, displayName, bio } = await request.json()

    // Get the session cookie
    const cookies = request.headers.get("cookie") || ""
    const sessionCookie = cookies
      .split("; ")
      .find((c) => c.startsWith("session="))
      ?.split("=")[1]

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Verify the session cookie
    const admin = await import("firebase-admin/auth")
    const decodedClaims = await admin.getAuth().verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Validate username format
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 })
    }

    // Check if username exists
    const creatorSnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    if (!creatorSnapshot.empty) {
      return NextResponse.json({ success: false, message: "Username is already taken" }, { status: 400 })
    }

    // Create creator profile
    const creatorData = {
      uid,
      username,
      displayName: displayName || username,
      bio: bio || "",
      profilePic: "",
      freeClips: [],
      paidClips: [],
      createdAt: new Date(),
    }

    // Add to creators collection
    await db.collection("creators").doc(uid).set(creatorData)

    // Update user document to mark profile as set up
    await db.collection("users").doc(uid).update({
      hasSetupProfile: true,
      username,
    })

    return NextResponse.json({ success: true, message: "Profile created successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error setting up profile:", error)
    return NextResponse.json({ success: false, message: "Error setting up profile" }, { status: 500 })
  }
}
