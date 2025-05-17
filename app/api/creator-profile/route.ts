import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    // Find creator profile by user ID
    const snapshot = await db.collection("creatorProfiles").where("uid", "==", userId).limit(1).get()

    if (snapshot.empty) {
      return NextResponse.json({ profile: null })
    }

    const profileDoc = snapshot.docs[0]
    const profile = {
      id: profileDoc.id,
      ...profileDoc.data(),
      // Ensure dates are serializable
      createdAt: profileDoc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: profileDoc.data().updatedAt?.toDate?.() || new Date(),
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return NextResponse.json({ error: "Failed to fetch creator profile" }, { status: 500 })
  }
}
