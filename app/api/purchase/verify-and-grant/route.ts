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

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // 1. Verify the Stripe session
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log(`✅ [Verify & Grant] Session retrieved. Status: ${session.payment_status}`)
    } catch (stripeError: any) {
      console.error(`❌ [Verify & Grant] Stripe error:`, stripeError)
      return NextResponse.json(
        {
          error: "Invalid session ID",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    if (session.payment_status !== "paid") {
      console.log(`❌ [Verify & Grant] Payment not completed. Status: ${session.payment_status}`)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    console.log(`✅ [Verify & Grant] Payment verified. Amount: ${session.amount_total}`)

    // 2. Get product info from session metadata or parameters
    const finalProductBoxId = productBoxId || session.metadata?.productBoxId || session.metadata?.bundleId
    const finalCreatorId = creatorId || session.metadata?.creatorId

    if (!finalProductBoxId) {
      return NextResponse.json({ error: "Product ID not found" }, { status: 400 })
    }

    // 3. Try to find the product in both collections
    let productDoc = null
    let productData = null
    let collectionUsed = null

    // First try bundles collection
    try {
      console.log(`🔍 [Verify & Grant] Checking bundles collection for ID: ${finalProductBoxId}`)
      productDoc = await db.collection("bundles").doc(finalProductBoxId).get()
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
        console.log(`🔍 [Verify & Grant] Checking productBoxes collection for ID: ${finalProductBoxId}`)
        productDoc = await db.collection("productBoxes").doc(finalProductBoxId).get()
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

    // 4. Get content items
    let contentItems: any[] = []
    try {
      if (collectionUsed === "bundles") {
        // For bundles, get content from the contents array
        contentItems = productData.contents || []
        console.log(`✅ [Verify & Grant] Found ${contentItems.length} items in bundle contents`)
      } else {
        // For productBoxes, get content from productBoxContent subcollection
        const contentSnapshot = await db.collection("productBoxes").doc(finalProductBoxId).collection("content").get()

        contentItems = contentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        console.log(`✅ [Verify & Grant] Found ${contentItems.length} items in productBox content`)
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error fetching content:`, error)
      contentItems = []
    }

    // 5. Create purchase record
    const purchaseData = {
      sessionId,
      productBoxId: finalProductBoxId,
      bundleId: finalProductBoxId, // For compatibility
      creatorId: finalCreatorId || productData.creatorId || productData.userId,
      buyerEmail: session.customer_details?.email || "anonymous",
      buyerUid: session.metadata?.userId || session.client_reference_id || "anonymous",
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
      totalSize: contentItems.reduce((sum: number, item: any) => sum + (item.fileSize || 0), 0),
      contents: contentItems,
      items: contentItems.map((item: any) => ({
        id: item.id || Math.random().toString(36),
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

    // 6. Save to multiple collections for compatibility
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

    // 7. Update creator earnings and stats
    try {
      if (finalCreatorId) {
        const creatorRef = db.collection("users").doc(finalCreatorId)
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
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error updating creator stats:`, error)
    }

    // 8. Update product sales counter
    try {
      if (collectionUsed === "bundles") {
        await db
          .collection("bundles")
          .doc(finalProductBoxId)
          .update({
            salesCount: (productData.salesCount || 0) + 1,
            lastSaleAt: new Date(),
          })
      } else {
        await db
          .collection("productBoxes")
          .doc(finalProductBoxId)
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
      purchase: {
        id: bundlePurchaseRef.id,
        productBoxId: finalProductBoxId,
        productBoxTitle: purchaseData.bundleTitle,
        productBoxDescription: purchaseData.productBoxDescription,
        productBoxThumbnail: purchaseData.productBoxThumbnail,
        creatorId: purchaseData.creatorId,
        creatorName: purchaseData.creatorName,
        creatorUsername: purchaseData.creatorUsername,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        items: purchaseData.items,
        totalItems: purchaseData.totalItems,
        totalSize: purchaseData.totalSize,
        purchasedAt: purchaseData.createdAt.toISOString(),
      },
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
