import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    // Check in usernames collection
    const usernameSnapshot = await db.collection("usernames").doc(username).get()

    // Check in creators collection as a backup
    const creatorSnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    const isAvailable = !usernameSnapshot.exists && creatorSnapshot.empty

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable ? "Username is available" : "Username is already taken",
    })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Failed to check username availability" }, { status: 500 })
  }
}
