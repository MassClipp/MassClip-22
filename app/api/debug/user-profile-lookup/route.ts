import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [User Profile Lookup] Looking up profile for user: ${userId}`)

    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log(`❌ [User Profile Lookup] User document not found for: ${userId}`)
      return NextResponse.json({
        exists: false,
        profile: null,
        error: "User profile not found",
      })
    }

    const profile = userDoc.data()
    console.log(`✅ [User Profile Lookup] Profile found with keys: ${Object.keys(profile || {})}`)

    return NextResponse.json({
      exists: true,
      profile,
    })
  } catch (error: any) {
    console.error("❌ [User Profile Lookup] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to lookup user profile",
        details: error.message,
        exists: false,
        profile: null,
      },
      { status: 500 },
    )
  }
}
