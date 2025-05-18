import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get the profile data from the request
    const profileData = await request.json()

    // Validate the username
    if (!profileData.username || profileData.username.length < 3) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 })
    }

    // Check if username is already taken
    const usernameSnapshot = await db
      .collection("creatorProfiles")
      .where("username", "==", profileData.username.toLowerCase())
      .get()

    if (!usernameSnapshot.empty) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    // Create the profile
    await db
      .collection("creatorProfiles")
      .doc(userId)
      .set(
        {
          ...profileData,
          username: profileData.username.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: userId,
        },
        { merge: true },
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating profile:", error)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}
