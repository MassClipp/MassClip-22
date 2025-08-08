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
    const purchaseQuery = await db.collection("bundlePurchases").where("sessionId", "==", sessionId).limit(1).get()
    
    let purchaseDoc = null
    let purchaseData = null

    if (!purchaseQuery.empty) {
      purchaseDoc = purchaseQuery.docs[0]
      purchaseData = purchaseDoc.data()
      console.log(`✅ [Verify Session] Found purchase document by sessionId query`)
    } else {
      // Try using sessionId as document ID (fallback)
      console.log(`🔍 [Verify Session] Trying sessionId as document ID: bundlePurchases/${sessionId}`)
      const directDoc = await db.collection("bundlePurchases").doc(sessionId).get()
      
      if (directDoc.exists) {
        purchaseDoc = directDoc
        purchaseData = directDoc.data()!
        console.log(`✅ [Verify Session] Found purchase document by direct ID lookup`)
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

    console.log(`✅ [Verify Session] Found purchase document`)
    console.log(`🔍 [Verify Session] Purchase data:`, {
      sessionId: purchaseData.sessionId,
      bundleId: purchaseData.bundleId,
      buyerUid: purchaseData.buyerUid,
      status: purchaseData.status,
      webhookProcessed: purchaseData.webhookProcessed,
      bundleTitle: purchaseData.bundleTitle,
      contentItems: purchaseData.bundleContent?.length || 0,
    })

    // STEP 2: Validate required fields
    if (!purchaseData.bundleId) {
      console.error(`❌ [Verify Session] No bundleId in purchase data`)
      return NextResponse.json(
        {
          success: false,
          error: "Bundle not found",
          details: "Purchase data is missing bundle information",
        },
        { status: 400 },
      )
    }

    // STEP 3: Get Stripe session data for verification
    let session: Stripe.Checkout.Session | null = null
    
    // Try to retrieve from connected account if we have the creator's Stripe account ID
    if (purchaseData.creatorStripeAccountId) {
      try {
        console.log(`🔍 [Verify Session] Retrieving session from connected account: ${purchaseData.creatorStripeAccountId}`)
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

    // STEP 4: Get bundle details if not already in purchase data
    let bundleData = null
    if (purchaseData.bundleId) {
      console.log(`🔍 [Verify Session] Looking up bundle: ${purchaseData.bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()
        console.log(`✅ [Verify Session] Retrieved bundle data: ${bundleData?.title}`)
      } else {
        console.warn(`⚠️ [Verify Session] Bundle not found: ${purchaseData.bundleId}`)
      }
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

    // STEP 6: Build response using purchase data (which contains all the info from webhook)
    const response = {
      success: true,
      session: {
        id: sessionId,
        amount: session?.amount_total || purchaseData.purchaseAmount || 0,
        currency: session?.currency || purchaseData.currency || "usd",
        payment_status: session?.payment_status || purchaseData.paymentStatus || "paid",
        customerEmail: session?.customer_details?.email || purchaseData.buyerEmail || "",
        created: session ? new Date(session.created * 1000).toISOString() : purchaseData.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      purchase: {
        sessionId: purchaseData.sessionId,
        paymentIntentId: purchaseData.paymentIntentId || "",
        userId: purchaseData.buyerUid || "",
        userEmail: purchaseData.buyerEmail || "",
        userName: purchaseData.buyerDisplayName || "",
        itemId: purchaseData.bundleId,
        amount: purchaseData.purchaseAmount || 0,
        currency: purchaseData.currency || "usd",
        type: "bundle",
        status: purchaseData.status || "completed",
      },
      item: {
        id: purchaseData.bundleId,
        title: purchaseData.bundleTitle || bundleData?.title || "Bundle",
        description: purchaseData.bundleDescription || bundleData?.description || "",
        thumbnailUrl: purchaseData.bundleThumbnail || bundleData?.thumbnailUrl || bundleData?.coverImage || "",
        creator: creatorData ? {
          id: purchaseData.creatorId,
          name: creatorData.displayName || creatorData.name || purchaseData.creatorDisplayName || "",
          username: creatorData.username || purchaseData.creatorUsername || "",
        } : null,
      },
      // Include bundle content info
      bundleContent: {
        items: purchaseData.bundleContent || [],
        totalItems: purchaseData.bundleTotalItems || 0,
        totalSize: purchaseData.bundleTotalSize || 0,
        totalSizeFormatted: purchaseData.bundleTotalSizeFormatted || "0 Bytes",
        totalDuration: purchaseData.bundleTotalDuration || 0,
        totalDurationFormatted: purchaseData.bundleTotalDurationFormatted || "0:00",
        contentBreakdown: purchaseData.bundleContentBreakdown || {},
      }
    }

    console.log(`✅ [Verify Session] Verification successful for session: ${sessionId}`)
    console.log(`📊 [Verify Session] Response summary:`, {
      sessionId: response.session.id,
      amount: response.session.amount,
      bundleTitle: response.item.title,
      creatorName: response.item.creator?.name,
      contentItems: response.bundleContent.totalItems,
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
