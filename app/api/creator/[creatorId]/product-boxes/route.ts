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

    // First try the bundles collection (new structure)
    let productBoxes: any[] = []

    try {
      const bundlesQuery = await db
        .collection("bundles")
        .where("creatorId", "==", creatorId)
        .where("active", "==", true)
        .orderBy("createdAt", "desc")
        .get()

      if (!bundlesQuery.empty) {
        console.log(`✅ [Creator Product Boxes API] Found ${bundlesQuery.size} bundles in bundles collection`)
        productBoxes = bundlesQuery.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }
    } catch (bundlesError) {
      console.log("⚠️ [Creator Product Boxes API] Bundles collection query failed, trying productBoxes collection")
    }

    // If no bundles found, try the productBoxes collection (legacy structure)
    if (productBoxes.length === 0) {
      try {
        const productBoxesQuery = await db
          .collection("productBoxes")
          .where("creatorId", "==", creatorId)
          .where("active", "==", true)
          .orderBy("createdAt", "desc")
          .get()

        if (!productBoxesQuery.empty) {
          console.log(
            `✅ [Creator Product Boxes API] Found ${productBoxesQuery.size} product boxes in productBoxes collection`,
          )
          productBoxes = productBoxesQuery.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        }
      } catch (productBoxesError) {
        console.log("⚠️ [Creator Product Boxes API] ProductBoxes collection query failed")
      }
    }

    // Also try by userId field as fallback
    if (productBoxes.length === 0) {
      try {
        const userIdQuery = await db
          .collection("bundles")
          .where("userId", "==", creatorId)
          .where("active", "==", true)
          .orderBy("createdAt", "desc")
          .get()

        if (!userIdQuery.empty) {
          console.log(`✅ [Creator Product Boxes API] Found ${userIdQuery.size} bundles by userId`)
          productBoxes = userIdQuery.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        }
      } catch (userIdError) {
        console.log("⚠️ [Creator Product Boxes API] UserId query failed")
      }
    }

    console.log(`✅ [Creator Product Boxes API] Final result: ${productBoxes.length} active product boxes`)

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
