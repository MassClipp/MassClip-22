import { type NextRequest, NextResponse } from "next/server"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { initializeFirebaseApp } from "@/lib/firebase"

// Initialize Firebase
initializeFirebaseApp()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    const db = getFirestore()

    // Check in usernames collection
    const usernameDoc = await getDoc(doc(db, "usernames", username))

    // Check in creators collection as a backup
    const creatorDoc = await getDoc(doc(db, "creators", username))

    const isAvailable = !usernameDoc.exists() && !creatorDoc.exists()

    return NextResponse.json({ available: isAvailable })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Failed to check username availability" }, { status: 500 })
  }
}
