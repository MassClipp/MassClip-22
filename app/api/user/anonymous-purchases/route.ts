import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { cookies } from "next/headers"

async function getAnonymousId(request: NextRequest): Promise<string | null> {
  const cookieStore = cookies()
  const anonymousId = cookieStore.get("anonymousId")
  return anonymousId ? anonymousId.value : null
}

export async function GET(request: NextRequest) {
  try {
    const anonymousId = await getAnonymousId(request)

    if (!anonymousId) {
      return NextResponse.json({ purchases: [] })
    }

    console.log(`🔍 [Anonymous Purchases] Fetching purchases for anonymous ID: ${anonymousId}`)

    const snapshot = await db.collection("purchases").where("anonymousId", "==", anonymousId).get()

    const purchases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      purchases,
      count: purchases.length,
    })
  } catch (error) {
    console.error("❌ [Anonymous Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch anonymous purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
