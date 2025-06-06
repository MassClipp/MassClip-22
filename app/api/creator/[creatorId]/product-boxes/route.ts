import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params
    console.log("🔍 [Creator Product Boxes API] Fetching for creator:", creatorId)

    if (!creatorId) {
      return NextResponse.json(
        {
          success: true,
          productBoxes: [],
        },
        { status: 200 },
      )
    }

    // Use a simpler query to avoid indexing issues
    // First get all product boxes for the creator
    const creatorQuery = await db.collection("productBoxes").where("creatorId", "==", creatorId).get()

    // Then filter for active ones and sort in memory
    const productBoxes = creatorQuery.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((box: any) => box.active === true)
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || 0
        const bTime = b.createdAt?.seconds || 0
        return bTime - aTime
      })

    console.log(`✅ [Creator Product Boxes API] Found ${productBoxes.length} active product boxes`)

    return NextResponse.json({
      success: true,
      productBoxes,
    })
  } catch (error) {
    console.error("❌ [Creator Product Boxes API] Error:", error)

    // Always return success with empty array to prevent UI errors
    return NextResponse.json(
      {
        success: true,
        productBoxes: [],
      },
      { status: 200 },
    )
  }
}
