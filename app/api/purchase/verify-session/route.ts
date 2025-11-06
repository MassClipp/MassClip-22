import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification")

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] No session ID provided")
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Verify Session] Verifying session: ${sessionId}`)

    // STEP 1: Look for purchase document in bundlePurchases collection
    console.log(`🔍 [Verify Session] Looking up purchase in bundlePurchases collection`)

    // Try to find by sessionId field first
    const bundlePurchaseQuery = await db
      .collection("bundlePurchases")
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get()

    let purchaseDoc = null
    let purchaseData = null
    let purchaseType: "bundle" | "ebook" = "bundle"

    if (!bundlePurchaseQuery.empty) {
      purchaseDoc = bundlePurchaseQuery.docs[0]
      purchaseData = purchaseDoc.data()
      purchaseType = "bundle"
      console.log(`✅ [Verify Session] Found bundle purchase document by sessionId query`)
    } else {
      // Try using sessionId as document ID (fallback)
      console.log(`🔍 [Verify Session] Trying sessionId as document ID: bundlePurchases/${sessionId}`)
      const directDoc = await db.collection("bundlePurchases").doc(sessionId).get()

      if (directDoc.exists) {
        purchaseDoc = directDoc
        purchaseData = directDoc.data()!
        purchaseType = "bundle"
        console.log(`✅ [Verify Session] Found bundle purchase document by direct ID lookup`)
      }
    }

    // If not found in bundlePurchases, check ebookPurchases
    if (!purchaseData) {
      console.log(`🔍 [Verify Session] Looking up purchase in ebookPurchases collection`)

      const ebookPurchaseQuery = await db
        .collection("ebookPurchases")
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get()

      if (!ebookPurchaseQuery.empty) {
        purchaseDoc = ebookPurchaseQuery.docs[0]
        purchaseData = purchaseDoc.data()
        purchaseType = "ebook"
        console.log(`✅ [Verify Session] Found ebook purchase document by sessionId query`)
      } else {
        // Try using sessionId as document ID (fallback)
        console.log(`🔍 [Verify Session] Trying sessionId as document ID: ebookPurchases/${sessionId}`)
        const directDoc = await db.collection("ebookPurchases").doc(sessionId).get()

        if (directDoc.exists) {
          purchaseDoc = directDoc
          purchaseData = directDoc.data()!
          purchaseType = "ebook"
          console.log(`✅ [Verify Session] Found ebook purchase document by direct ID lookup`)
        }
      }
    }

    if (!purchaseData) {
      console.error(`❌ [Verify Session] No purchase found for session: ${sessionId}`)
      return NextResponse.json(
        {
          success: false,
          error: "Purchase not found",
          details: "The webhook may still be processing your purchase. Please wait a moment and try again.",
        },
        { status: 404 },
      )
    }

    console.log(`✅ [Verify Session] Found ${purchaseType} purchase document`)
    console.log(`🔍 [Verify Session] Purchase data:`, {
      sessionId: purchaseData.sessionId,
      itemId: purchaseData.bundleId || purchaseData.ebookId,
      buyerUid: purchaseData.buyerUid,
      status: purchaseData.status,
      webhookProcessed: purchaseData.webhookProcessed,
      title: purchaseData.bundleTitle || purchaseData.ebookTitle,
      type: purchaseType,
    })

    // STEP 2: Validate required fields
    const itemId = purchaseData.bundleId || purchaseData.ebookId
    if (!itemId) {
      console.error(`❌ [Verify Session] No item ID in purchase data`)
      return NextResponse.json(
        {
          success: false,
          error: "Item not found",
          details: "Purchase data is missing item information",
        },
        { status: 400 },
      )
    }

    // STEP 3: Get Stripe session data for verification
    let session: Stripe.Checkout.Session | null = null

    // Try to retrieve from connected account if we have the creator's Stripe account ID
    if (purchaseData.creatorStripeAccountId) {
      try {
        console.log(
          `🔍 [Verify Session] Retrieving session from connected account: ${purchaseData.creatorStripeAccountId}`,
        )
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: purchaseData.creatorStripeAccountId,
        })
        console.log(`✅ [Verify Session] Retrieved Stripe session from connected account`)
      } catch (error: any) {
        console.warn(`⚠️ [Verify Session] Failed to retrieve from connected account: ${error.message}`)
        // Fall through to platform account attempt
      }
    }

    // Try platform account if connected account failed or not available
    if (!session) {
      try {
        console.log(`🔍 [Verify Session] Retrieving session from platform account`)
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "payment_intent"],
        })
        console.log(`✅ [Verify Session] Retrieved Stripe session from platform account`)
      } catch (error: any) {
        console.error(`❌ [Verify Session] Failed to retrieve session from platform account: ${error.message}`)
        // Continue with purchase data only (webhook already verified the session)
      }
    }

    // STEP 4: Get item details (bundle or ebook)
    let itemData = null
    const collectionName = purchaseType === "bundle" ? "bundles" : "ebooks"
    console.log(`🔍 [Verify Session] Looking up ${purchaseType}: ${itemId}`)
    const itemDoc = await db.collection(collectionName).doc(itemId).get()
    if (itemDoc.exists) {
      itemData = itemDoc.data()
      console.log(`✅ [Verify Session] Retrieved ${purchaseType} data: ${itemData?.title}`)
    } else {
      console.warn(`⚠️ [Verify Session] ${purchaseType} not found: ${itemId}`)
    }

    // STEP 5: Get creator details
    let creatorData = null
    if (purchaseData.creatorId) {
      console.log(`🔍 [Verify Session] Looking up creator: ${purchaseData.creatorId}`)
      const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
        console.log(`✅ [Verify Session] Retrieved creator data: ${creatorData?.displayName}`)
      } else {
        console.warn(`⚠️ [Verify Session] Creator not found: ${purchaseData.creatorId}`)
      }
    }

    // STEP 6: Build response using purchase data
    const response = {
      success: true,
      session: {
        id: sessionId,
        amount: session?.amount_total || purchaseData.purchaseAmount || 0,
        currency: session?.currency || purchaseData.currency || "usd",
        payment_status: session?.payment_status || purchaseData.paymentStatus || "paid",
        customerEmail: session?.customer_details?.email || purchaseData.buyerEmail || "",
        created: session
          ? new Date(session.created * 1000).toISOString()
          : purchaseData.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      purchase: {
        sessionId: purchaseData.sessionId,
        paymentIntentId: purchaseData.paymentIntentId || "",
        userId: purchaseData.buyerUid || "",
        userEmail: purchaseData.buyerEmail || "",
        userName: purchaseData.buyerDisplayName || "",
        itemId: itemId,
        amount: purchaseData.purchaseAmount || 0,
        currency: purchaseData.currency || "usd",
        type: purchaseType,
        status: purchaseData.status || "completed",
      },
      item: {
        id: itemId,
        title:
          purchaseData.bundleTitle ||
          purchaseData.ebookTitle ||
          itemData?.title ||
          (purchaseType === "bundle" ? "Bundle" : "eBook"),
        description: purchaseData.bundleDescription || purchaseData.ebookDescription || itemData?.description || "",
        thumbnailUrl:
          purchaseData.bundleThumbnail ||
          purchaseData.ebookCoverUrl ||
          itemData?.thumbnailUrl ||
          itemData?.coverUrl ||
          itemData?.coverImage ||
          "",
        creator: creatorData
          ? {
              id: purchaseData.creatorId,
              name: creatorData.displayName || creatorData.name || purchaseData.creatorDisplayName || "",
              username: creatorData.username || purchaseData.creatorUsername || "",
            }
          : null,
      },
    }

    // Add type-specific content info
    if (purchaseType === "bundle") {
      ;(response as any).bundleContent = {
        items: purchaseData.bundleContent || [],
        totalItems: purchaseData.bundleTotalItems || 0,
        totalSize: purchaseData.bundleTotalSize || 0,
        totalSizeFormatted: purchaseData.bundleTotalSizeFormatted || "0 Bytes",
        totalDuration: purchaseData.bundleTotalDuration || 0,
        totalDurationFormatted: purchaseData.bundleTotalDurationFormatted || "0:00",
        contentBreakdown: purchaseData.bundleContentBreakdown || {},
      }
    } else if (purchaseType === "ebook") {
      ;(response as any).ebookContent = {
        pageCount: purchaseData.ebookPageCount || itemData?.pageCount || 0,
        coverUrl: purchaseData.ebookCoverUrl || itemData?.coverUrl || "",
      }
    }

    console.log(`✅ [Verify Session] Verification successful for session: ${sessionId}`)
    console.log(`📊 [Verify Session] Response summary:`, {
      sessionId: response.session.id,
      amount: response.session.amount,
      itemTitle: response.item.title,
      creatorName: response.item.creator?.name,
      type: purchaseType,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
