import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    console.log(`🔍 [Profile Lookup] Looking up user: ${userId}`)

    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log(`❌ [Profile Lookup] User document not found: ${userId}`)
      return NextResponse.json({
        exists: false,
        profile: null,
        error: "User document not found",
      })
    }

    const userData = userDoc.data()
    console.log(`✅ [Profile Lookup] User document found with fields:`, Object.keys(userData || {}))

    return NextResponse.json({
      exists: true,
      profile: userData,
      documentId: userDoc.id,
    })
  } catch (error: any) {
    console.error("❌ [Profile Lookup] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to lookup user profile",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
