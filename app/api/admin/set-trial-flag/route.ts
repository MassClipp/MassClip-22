import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Set the flag in the users collection
    await adminDb.collection("users").doc(userId).set(
      {
        hasEverPurchasedFacelessprenuer: true,
        flagSetManually: true,
        flagSetAt: new Date().toISOString(),
      },
      { merge: true },
    )

    console.log(`[v0] ✅ Manually set hasEverPurchasedFacelessprenuer flag for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `Trial flag set for user ${userId}. They will no longer be eligible for the free trial.`,
    })
  } catch (error: any) {
    console.error("[v0] Error setting trial flag:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
