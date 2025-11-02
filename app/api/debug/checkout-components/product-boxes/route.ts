import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    console.log(`🔍 [Debug] Fetching available product boxes...`)

    const firebaseAdmin = await import("@/lib/firebase-admin")
    const db = firebaseAdmin.db

    const snapshot = await db.collection("productBoxes").limit(10).get()

    const productBoxes = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled",
        price: data.price || 0,
        creatorId: data.creatorId || "unknown",
        active: data.active || false,
      }
    })

    console.log(`✅ [Debug] Found ${productBoxes.length} product boxes`)

    return NextResponse.json({
      success: true,
      productBoxes,
      count: productBoxes.length,
    })
  } catch (error) {
    console.error(`❌ [Debug] Error fetching product boxes:`, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
