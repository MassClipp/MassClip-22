import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { isValidUsername } from "@/lib/username-validation"

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")

  if (!username) {
    return NextResponse.json({ available: false, error: "Username is required" }, { status: 400 })
  }

  // Validate username format
  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        available: false,
        error: "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores",
      },
      { status: 400 },
    )
  }

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Check if username exists
    const snapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    return NextResponse.json({ available: snapshot.empty })
  } catch (error) {
    console.error("Error checking username availability:", error)
    return NextResponse.json({ available: false, error: "Failed to check username availability" }, { status: 500 })
  }
}
