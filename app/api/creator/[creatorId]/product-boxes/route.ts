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

    // First try bundles collection (new structure)
    let bundlesQuery = await db.collection("bundles").where("creatorId", "==", creatorId).get()

    // If no results, try with userId field
    if (bundlesQuery.empty) {
      bundlesQuery = await db.collection("bundles").where("userId", "==", creatorId).get()
    }

    let productBoxes: any[] = []

    if (!bundlesQuery.empty) {
      console.log(`✅ [Creator Product Boxes API] Found ${bundlesQuery.size} bundles`)

      productBoxes = bundlesQuery.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((box: any) => box.active === true) // Only show active bundles
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds || 0
          const bTime = b.createdAt?.seconds || 0
          return bTime - aTime
        })
    } else {
      // Fallback to productBoxes collection (legacy)
      console.log("🔄 [Creator Product Boxes API] No bundles found, trying productBoxes collection")

      const productBoxesQuery = await db.collection("productBoxes").where("creatorId", "==", creatorId).get()

      productBoxes = productBoxesQuery.docs
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
    }

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
