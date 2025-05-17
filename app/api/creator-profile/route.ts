import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import type { CreatorProfile } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const username = url.searchParams.get("username")

    if (!userId && !username) {
      return NextResponse.json({ error: "Missing userId or username parameter" }, { status: 400 })
    }

    let profileDoc

    if (username) {
      // Find by username
      const snapshot = await db
        .collection("creatorProfiles")
        .where("username", "==", username.toLowerCase())
        .limit(1)
        .get()

      if (!snapshot.empty) {
        profileDoc = snapshot.docs[0]
      }
    } else if (userId) {
      // Find by user ID
      profileDoc = await db.collection("creatorProfiles").doc(userId).get()
    }

    if (profileDoc && profileDoc.exists) {
      const profile = {
        uid: profileDoc.id,
        ...profileDoc.data(),
      } as CreatorProfile

      return NextResponse.json({ profile })
    }

    return NextResponse.json({ profile: null })
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
