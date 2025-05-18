import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get username from query params
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Query Firestore to check if username exists
    const creatorsRef = db.collection("creators")
    const snapshot = await creatorsRef.where("username", "==", username.toLowerCase()).limit(1).get()

    const isUnique = snapshot.empty

    return NextResponse.json({ isUnique })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 })
  }
}
