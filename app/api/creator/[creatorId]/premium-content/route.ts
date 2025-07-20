import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    console.log(`🔍 Fetching PREMIUM CONTENT (bundles) for creator: ${creatorId}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    let premiumContent: any[] = []

    try {
      console.log("📁 Checking bundles collection...")
      const bundlesRef = db.collection("bundles")
      const snapshot = await bundlesRef.where("creatorId", "==", creatorId).get()

      console.log(`📊 Found ${snapshot.size} bundles`)

      if (!snapshot.empty) {
        premiumContent = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data()

            // Get content count from the content array or contentItems
            let contentCount = 0
            if (data.content && Array.isArray(data.content)) {
              contentCount = data.content.length
            } else if (data.contentItems && Array.isArray(data.contentItems)) {
              contentCount = data.contentItems.length
            } else if (data.contentCount) {
              contentCount = data.contentCount
            }

            // Try multiple thumbnail field names
            const thumbnailUrl = data.thumbnailUrl || data.thumbnail || data.imageUrl || data.image || null

            console.log(`📦 Bundle Details:`, {
              id: doc.id,
              title: data.title,
              price: data.price,
              thumbnailUrl: thumbnailUrl,
              stripePriceId: data.stripePriceId,
              stripeProductId: data.stripeProductId,
              contentCount: contentCount,
              description: data.description,
              rawData: Object.keys(data), // Log all available fields
            })

            return {
              id: doc.id,
              title: data.title || "Untitled Bundle",
              thumbnailUrl: thumbnailUrl,
              type: "bundle",
              price: data.price || 0,
              description: data.description || "No description available",
              creatorId: data.creatorId || "",
              createdAt: data.createdAt || new Date(),
              views: data.views || 0,
              downloads: data.downloads || 0,
              duration: "Bundle",
              isPremium: true,
              contentCount: contentCount,
              stripePriceId: data.stripePriceId || null,
              stripeProductId: data.stripeProductId || null,
              content: data.content || data.contentItems || [],
            }
          }),
        )

        console.log(`✅ Successfully loaded ${premiumContent.length} bundles`)
        console.log("Bundle data:", premiumContent)
      } else {
        console.log("ℹ️ No bundles found")
      }
    } catch (error) {
      console.error("❌ Error checking bundles collection:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch bundles",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    console.log(`📊 FINAL RESULT: ${premiumContent.length} bundles`)

    return NextResponse.json({
      content: premiumContent,
      totalFound: premiumContent.length,
      creatorId,
      source: "bundles_collection",
    })
  } catch (error) {
    console.error("❌ PREMIUM CONTENT API ERROR:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch creator premium content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
