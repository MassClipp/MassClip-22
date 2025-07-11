import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, creatorId } = await request.json()

    console.log(`🔍 [Verify & Grant] Starting verification for session: ${sessionId}`)
    console.log(`🔍 [Verify & Grant] Product ID: ${productBoxId}, Creator ID: ${creatorId}`)

    // 1. Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      console.log(`❌ [Verify & Grant] Payment not completed. Status: ${session.payment_status}`)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    console.log(`✅ [Verify & Grant] Payment verified. Amount: ${session.amount_total}`)

    // 2. Try to find the product in both collections
    let productDoc = null
    let productData = null
    let collectionUsed = null

    // First try bundles collection
    try {
      console.log(`🔍 [Verify & Grant] Checking bundles collection for ID: ${productBoxId}`)
      productDoc = await db.collection("bundles").doc(productBoxId).get()
      if (productDoc.exists) {
        productData = productDoc.data()
        collectionUsed = "bundles"
        console.log(`✅ [Verify & Grant] Found product in bundles collection`)
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error checking bundles:`, error)
    }

    // If not found in bundles, try productBoxes
    if (!productData) {
      try {
        console.log(`🔍 [Verify & Grant] Checking productBoxes collection for ID: ${productBoxId}`)
        productDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (productDoc.exists) {
          productData = productDoc.data()
          collectionUsed = "productBoxes"
          console.log(`✅ [Verify & Grant] Found product in productBoxes collection`)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Error checking productBoxes:`, error)
      }
    }

    if (!productData) {
      console.log(`❌ [Verify & Grant] Product not found in either collection`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // 3. Get content items
    let contentItems = []
    try {
      if (collectionUsed === "bundles") {
        // For bundles, get content from the contents array
        contentItems = productData.contents || []
      } else {
        // For productBoxes, get content from productBoxContent subcollection
        const contentSnapshot = await db.collection("productBoxes").doc(productBoxId).collection("content").get()

        contentItems = contentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }
      console.log(`✅ [Verify & Grant] Found ${contentItems.length} content items`)
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error fetching content:`, error)
      contentItems = []
    }

    // 4. Create purchase record
    const purchaseData = {
      sessionId,
      productBoxId,
      bundleId: productBoxId, // For compatibility
      creatorId,
      buyerEmail: session.customer_details?.email || "anonymous",
      buyerUid: session.metadata?.userId || "anonymous",
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
      bundleTitle: productData.title || "Untitled Bundle",
      productBoxTitle: productData.title || "Untitled Bundle",
      productBoxDescription: productData.description || "",
      productBoxThumbnail: productData.customPreviewThumbnail || productData.thumbnailUrl || "",
      creatorName: productData.creatorName || "Unknown Creator",
      creatorUsername: productData.creatorUsername || "unknown",
      totalItems: contentItems.length,
      totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
      contents: contentItems,
      items: contentItems.map((item) => ({
        id: item.id,
        title: item.title || item.name || "Untitled",
        fileUrl: item.fileUrl || item.url || "",
        thumbnailUrl: item.thumbnailUrl || item.thumbnail || "",
        fileSize: item.fileSize || 0,
        duration: item.duration || 0,
        contentType: item.contentType || item.type || "unknown",
        displaySize: formatFileSize(item.fileSize || 0),
        displayDuration: formatDuration(item.duration || 0),
      })),
      source: collectionUsed,
      stripeSessionId: sessionId,
      stripePaymentIntentId: session.payment_intent,
    }

    // 5. Save to multiple collections for compatibility
    const batch = db.batch()

    // Save to bundlePurchases (primary)
    const bundlePurchaseRef = db.collection("bundlePurchases").doc()
    batch.set(bundlePurchaseRef, purchaseData)

    // Save to unifiedPurchases
    const unifiedPurchaseRef = db.collection("unifiedPurchases").doc()
    batch.set(unifiedPurchaseRef, {
      ...purchaseData,
      userId: purchaseData.buyerUid,
      purchaseDate: purchaseData.createdAt,
    })

    // Save to productBoxPurchases for compatibility
    const productBoxPurchaseRef = db.collection("productBoxPurchases").doc()
    batch.set(productBoxPurchaseRef, purchaseData)

    await batch.commit()

    console.log(`✅ [Verify & Grant] Purchase records created successfully`)

    // 6. Update creator earnings and stats
    try {
      const creatorRef = db.collection("users").doc(creatorId)
      const creatorDoc = await creatorRef.get()

      if (creatorDoc.exists) {
        const currentEarnings = creatorDoc.data()?.totalEarnings || 0
        const currentSales = creatorDoc.data()?.totalSales || 0

        await creatorRef.update({
          totalEarnings: currentEarnings + purchaseData.amount,
          totalSales: currentSales + 1,
          lastSaleAt: new Date(),
        })
        console.log(`✅ [Verify & Grant] Creator stats updated`)
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error updating creator stats:`, error)
    }

    // 7. Update product sales counter
    try {
      if (collectionUsed === "bundles") {
        await db
          .collection("bundles")
          .doc(productBoxId)
          .update({
            salesCount: (productData.salesCount || 0) + 1,
            lastSaleAt: new Date(),
          })
      } else {
        await db
          .collection("productBoxes")
          .doc(productBoxId)
          .update({
            salesCount: (productData.salesCount || 0) + 1,
            lastSaleAt: new Date(),
          })
      }
      console.log(`✅ [Verify & Grant] Product sales counter updated`)
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error updating sales counter:`, error)
    }

    return NextResponse.json({
      success: true,
      purchaseId: bundlePurchaseRef.id,
      productTitle: purchaseData.bundleTitle,
      contentItems: purchaseData.items,
      totalItems: purchaseData.totalItems,
      totalSize: purchaseData.totalSize,
      amount: purchaseData.amount,
      currency: purchaseData.currency,
    })
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Error:`, error)
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return ""
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${remainingSeconds}s`
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}
