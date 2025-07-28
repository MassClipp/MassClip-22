import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    console.log(`🔍 Fetching PRODUCT BOXES for creator: ${creatorId}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    let productBoxes: any[] = []

    try {
      console.log("📁 Checking product_boxes collection...")
      const productBoxesRef = db.collection("product_boxes")
      const snapshot = await productBoxesRef.where("creatorId", "==", creatorId).get()

      console.log(`📊 Found ${snapshot.size} product boxes`)

      if (!snapshot.empty) {
        productBoxes = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log(`📦 Product box:`, {
            id: doc.id,
            title: data.title,
            price: data.price,
            thumbnailUrl: data.thumbnailUrl ? "✅" : "❌",
          })

          return {
            id: doc.id,
            title: data.title || "Untitled Product",
            description: data.description || "",
            price: data.price || 0,
            thumbnailUrl: data.thumbnailUrl || "",
            creatorId: data.creatorId || "",
            createdAt: data.createdAt || new Date(),
            views: data.views || 0,
            downloads: data.downloads || 0,
            type: "premium",
          }
        })

        console.log(`✅ Successfully loaded ${productBoxes.length} product boxes`)
      } else {
        console.log("ℹ️ No product boxes found")
      }
    } catch (error) {
      console.error("❌ Error checking product_boxes collection:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch product boxes",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    console.log(`📊 FINAL RESULT: ${productBoxes.length} product boxes`)

    return NextResponse.json({
      productBoxes,
      totalFound: productBoxes.length,
      creatorId,
      source: "product_boxes_collection",
    })
  } catch (error) {
    console.error("❌ PRODUCT BOXES API ERROR:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch creator product boxes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
