import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { validateUsername } from "@/lib/username-validation"

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Validate username format
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.message, available: false }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Check if username already exists in creators collection
    const snapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    return NextResponse.json({
      available: snapshot.empty,
      message: snapshot.empty ? "Username is available" : "Username is already taken",
    })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Failed to check username availability" }, { status: 500 })
  }
}
