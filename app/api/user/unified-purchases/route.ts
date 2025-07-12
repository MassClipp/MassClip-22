import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Unified Purchases] Fetching user purchases`)

    // For demo purposes, return sample purchases
    const samplePurchases = [
      {
        id: "purchase_1",
        productBoxId: "product_1",
        productBoxTitle: "Premium Video Collection",
        productBoxDescription: "High-quality video content for creators",
        productBoxThumbnail: "/placeholder.svg?height=64&width=64",
        creatorId: "creator_1",
        creatorName: "John Creator",
        creatorUsername: "johncreator",
        amount: 29.99,
        currency: "usd",
        items: [
          {
            id: "item_1",
            title: "4K Video Tutorial",
            fileUrl: "/placeholder.mp4",
            thumbnailUrl: "/placeholder.svg?height=40&width=40",
            fileSize: 150000000,
            duration: 1800,
            contentType: "video" as const,
          },
          {
            id: "item_2",
            title: "Audio Commentary",
            fileUrl: "/placeholder.mp3",
            thumbnailUrl: "/placeholder.svg?height=40&width=40",
            fileSize: 25000000,
            duration: 900,
            contentType: "audio" as const,
          },
        ],
        totalItems: 2,
        totalSize: 175000000,
        purchasedAt: new Date().toISOString(),
        status: "completed",
      },
      {
        id: "purchase_2",
        productBoxId: "product_2",
        productBoxTitle: "Digital Art Bundle",
        productBoxDescription: "Professional digital artwork and templates",
        productBoxThumbnail: "/placeholder.svg?height=64&width=64",
        creatorId: "creator_2",
        creatorName: "Sarah Artist",
        creatorUsername: "sarahartist",
        amount: 19.99,
        currency: "usd",
        items: [
          {
            id: "item_3",
            title: "Digital Artwork Pack",
            fileUrl: "/placeholder.zip",
            thumbnailUrl: "/placeholder.svg?height=40&width=40",
            fileSize: 50000000,
            duration: 0,
            contentType: "document" as const,
          },
        ],
        totalItems: 1,
        totalSize: 50000000,
        purchasedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        status: "completed",
      },
    ]

    // Try to fetch real purchases from database
    try {
      const purchasesSnapshot = await db.collection("purchases").limit(10).get()

      if (!purchasesSnapshot.empty) {
        const realPurchases = purchasesSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            productBoxId: data.productBoxId || "unknown",
            productBoxTitle: data.productTitle || data.productBoxTitle || "Untitled Purchase",
            productBoxDescription: data.productDescription || data.productBoxDescription || "",
            productBoxThumbnail: data.productThumbnail || data.productBoxThumbnail || "/placeholder.svg",
            creatorId: data.creatorId || "unknown",
            creatorName: data.creatorName || "Unknown Creator",
            creatorUsername: data.creatorUsername || "unknown",
            amount: data.amount || 0,
            currency: data.currency || "usd",
            items: data.items || [],
            totalItems: data.totalItems || 0,
            totalSize: data.totalSize || 0,
            purchasedAt:
              data.purchasedAt?.toDate?.()?.toISOString() ||
              data.createdAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            status: data.status || "completed",
          }
        })

        console.log(`✅ [Unified Purchases] Found ${realPurchases.length} real purchases`)
        return NextResponse.json({ purchases: realPurchases })
      }
    } catch (dbError) {
      console.warn(`⚠️ [Unified Purchases] Database error, using sample data:`, dbError)
    }

    console.log(`✅ [Unified Purchases] Returning ${samplePurchases.length} sample purchases`)
    return NextResponse.json({ purchases: samplePurchases })
  } catch (error: any) {
    console.error(`❌ [Unified Purchases] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
        purchases: [], // Always return empty array on error
      },
      { status: 500 },
    )
  }
}
