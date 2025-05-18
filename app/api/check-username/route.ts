import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { validateUsername } from "@/lib/username-validation"

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    // Validate username format
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json({ available: false, message: validation.message }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Check if username exists in creators collection
    const creatorSnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    if (!creatorSnapshot.empty) {
      return NextResponse.json({ available: false, message: "Username is already taken" }, { status: 200 })
    }

    return NextResponse.json({ available: true, message: "Username is available" }, { status: 200 })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ available: false, message: "Error checking username" }, { status: 500 })
  }
}
