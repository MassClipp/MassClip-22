import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Profile Lookup] Looking up profile for user: ${userId}`)

    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        exists: false,
        error: "User profile not found",
        profile: null,
      })
    }

    const profile = userDoc.data()
    console.log(`✅ [Profile Lookup] Profile found for ${userId}`)

    return NextResponse.json({
      exists: true,
      profile: profile,
      hasStripeAccountId: !!profile?.stripeAccountId,
    })
  } catch (error: any) {
    console.error("❌ [Profile Lookup] Error:", error)
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
