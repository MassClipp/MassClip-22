import { type NextRequest, NextResponse } from "next/server"
import { retrieveSessionSmart } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    console.log("📝 [Verify Session] Request body:", { ...body, idToken: "[REDACTED]" })

    const { sessionId, idToken } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Verify Session] Processing session:", sessionId)

    // Verify Firebase token if provided
    let userId = null
    if (idToken) {
      try {
        console.log("🔐 [Verify Session] Verifying Firebase token...")
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Verify Session] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Verify Session] Token verification failed:", error)
        console.log("⚠️ [Verify Session] Continuing without authentication...")
      }
    }

    // First, try to get the session metadata to find the connected account
    console.log("🔍 [Verify Session] Looking for existing purchase record to get connected account...")

    let connectedAccountId = null
    let creatorId = null

    // Check if we have this session in our database already
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchaseQuery.empty) {
      const purchaseData = existingPurchaseQuery.docs[0].data()
      creatorId = purchaseData.creatorId
      connectedAccountId = purchaseData.connectedAccountId
      console.log("📦 [Verify Session] Found existing purchase with creatorId:", creatorId)
      console.log("🔗 [Verify Session] Connected account from purchase:", connectedAccountId)
    }

    // If we have a creatorId but no connected account, get it from creator profile
    if (creatorId && !connectedAccountId) {
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          connectedAccountId = creatorData?.stripeAccountId
          console.log("🔗 [Verify Session] Found connected account ID from creator:", connectedAccountId)
        }
      } catch (error) {
        console.error("❌ [Verify Session] Failed to get creator's connected account:", error)
      }
    }

    // Enhanced session retrieval with Stripe Connect support
    console.log("💳 [Verify Session] Retrieving Stripe session:", sessionId)
    console.log("   Connected Account ID:", connectedAccountId || "None (will try platform account)")

    let session
    let retrievalMethod = "unknown"

    try {
      session = await retrieveSessionSmart(sessionId, connectedAccountId)
      retrievalMethod = connectedAccountId ? "connected_account" : "platform_account"

      console.log("✅ [Verify Session] Session retrieved successfully:")
      console.log("   ID:", session.id)
      console.log("   Payment Status:", session.payment_status)
      console.log("   Status:", session.status)
      console.log("   Amount:", session.amount_total)
      console.log("   Currency:", session.currency)
      console.log("   Customer Email:", session.customer_details?.email)
      console.log("   Metadata:", session.metadata)
      console.log("   Retrieval Method:", retrievalMethod)
      console.log("   Connected Account:", connectedAccountId || "Platform")
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve session:", error)

      if (error.type === "StripeInvalidRequestError" && error.message?.includes("No such checkout.session")) {
        console.error("❌ [Verify Session] Session not found - likely Stripe Connect issue")

        // Enhanced error response for Stripe Connect issues
        return NextResponse.json(
          {
            error: "Session not found",
            details: "This checkout session could not be found. This might be a Stripe Connect configuration issue.",
            sessionId,
            sessionPrefix: sessionId.substring(0, 8),
            possibleCauses: [
              "Session was created in a connected Stripe account but we're looking in the platform account",
              "Connected account ID is missing or incorrect",
              "Session was created with different API credentials",
              "Session has expired (24 hour limit)",
              "Session was deleted from Stripe dashboard",
            ],
            debugInfo: {
              hasConnectedAccountId: !!connectedAccountId,
              connectedAccountId: connectedAccountId || null,
              creatorId: creatorId || null,
              retrievalMethod,
              sessionType: sessionId.startsWith("cs_live_") ? "live" : "test",
              stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
            },
            suggestion:
              "If this is a Stripe Connect setup, ensure the connected account ID is properly stored and retrieved.",
          },
          { status: 404 },
        )
      }

      // Other Stripe errors
      return NextResponse.json(
        {
          error: "Failed to retrieve session",
          details: error.message,
          type: error.type || "unknown",
          sessionId,
          debugInfo: {
            connectedAccountId,
            creatorId,
            retrievalMethod,
            errorType: error.type,
            errorCode: error.code,
          },
        },
        { status: 400 },
      )
    }

    // Validate session status
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Session] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          paymentStatus: session.payment_status,
          sessionStatus: session.status,
          sessionId: session.id,
          details: "The payment for this session has not been completed successfully",
        },
        { status: 400 },
      )
    }

    // Extract metadata
    const productBoxId = session.metadata?.productBoxId
    const bundleId = session.metadata?.bundleId
    const sessionUserId = session.metadata?.userId
    const sessionCreatorId = session.metadata?.creatorId || creatorId

    if (!productBoxId && !bundleId) {
      console.error("❌ [Verify Session] Missing product/bundle ID in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session metadata",
          details: "No product or bundle ID found in session",
          metadata: session.metadata,
        },
        { status: 400 },
      )
    }

    // Use authenticated user ID if available, otherwise use session metadata
    const finalUserId = userId || sessionUserId

    console.log("📦 [Verify Session] Processing purchase:")
    console.log("   Product Box ID:", productBoxId)
    console.log("   Bundle ID:", bundleId)
    console.log("   User ID (auth):", userId)
    console.log("   User ID (session):", sessionUserId)
    console.log("   Final User ID:", finalUserId)
    console.log("   Creator ID:", sessionCreatorId)
    console.log("   Connected Account:", connectedAccountId)

    // Check if purchase already exists
    console.log("🔍 [Verify Session] Checking for existing purchase...")
    let purchaseId
    let alreadyProcessed = false

    if (!existingPurchaseQuery.empty) {
      console.log("ℹ️ [Verify Session] Purchase already exists")
      purchaseId = existingPurchaseQuery.docs[0].id
      alreadyProcessed = true
    } else {
      // Create new purchase record
      console.log("💾 [Verify Session] Creating new purchase record...")

      // Determine the item ID and type
      const itemId = productBoxId || bundleId
      const itemType = productBoxId ? "product_box" : "bundle"

      const purchaseData = {
        sessionId,
        productBoxId: productBoxId || null,
        bundleId: bundleId || null,
        itemId,
        itemType,
        userId: finalUserId,
        creatorId: sessionCreatorId || null,
        connectedAccountId: connectedAccountId || null,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email || null,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeSessionId: sessionId,
        verificationMethod: "direct_api",
        retrievalMethod,
        verifiedAt: new Date(),
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      purchaseId = purchaseRef.id
      console.log("✅ [Verify Session] Purchase record created:", purchaseId)

      // Grant user access if we have a user ID
      if (finalUserId) {
        console.log("🔓 [Verify Session] Granting user access...")
        try {
          // Add to user's purchases subcollection
          await db
            .collection("users")
            .doc(finalUserId)
            .collection("purchases")
            .doc(purchaseId)
            .set({
              productBoxId: productBoxId || null,
              bundleId: bundleId || null,
              itemId,
              itemType,
              purchaseId,
              sessionId,
              amount: session.amount_total,
              purchasedAt: new Date(),
              status: "active",
            })

          // Update user's main document with purchase info
          const accessKey = productBoxId ? `productBoxAccess.${productBoxId}` : `bundleAccess.${bundleId}`
          await db
            .collection("users")
            .doc(finalUserId)
            .update({
              [accessKey]: {
                purchaseId,
                sessionId,
                grantedAt: new Date(),
                accessType: "purchased",
              },
              updatedAt: new Date(),
            })

          console.log("✅ [Verify Session] User access granted")
        } catch (error) {
          console.error("❌ [Verify Session] Failed to grant user access:", error)
          // Don't fail the whole verification if access granting fails
        }
      }

      // Update item stats
      try {
        const collection = productBoxId ? "productBoxes" : "bundles"
        const docId = productBoxId || bundleId

        await db
          .collection(collection)
          .doc(docId!)
          .update({
            "stats.totalSales": db.FieldValue.increment(1),
            "stats.totalRevenue": db.FieldValue.increment(session.amount_total || 0),
            "stats.lastSaleAt": new Date(),
            updatedAt: new Date(),
          })
        console.log(`✅ [Verify Session] ${itemType} stats updated`)
      } catch (error) {
        console.error(`❌ [Verify Session] Failed to update ${itemType} stats:`, error)
      }
    }

    // Get item details for response
    const collection = productBoxId ? "productBoxes" : "bundles"
    const docId = productBoxId || bundleId
    const itemDoc = await db.collection(collection).doc(docId!).get()
    const itemData = itemDoc.exists ? itemDoc.data() : {}

    console.log("✅ [Verify Session] Verification completed successfully")

    return NextResponse.json({
      success: true,
      alreadyProcessed,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
        created: new Date(session.created * 1000).toISOString(),
        connectedAccount: connectedAccountId,
        retrievalMethod,
      },
      purchase: {
        id: purchaseId,
        productBoxId: productBoxId || null,
        bundleId: bundleId || null,
        itemId: docId,
        itemType: productBoxId ? "product_box" : "bundle",
        userId: finalUserId,
        creatorId: sessionCreatorId,
        amount: session.amount_total || 0,
      },
      item: {
        title: itemData?.title || `${productBoxId ? "Product Box" : "Bundle"}`,
        description: itemData?.description,
        type: productBoxId ? "product_box" : "bundle",
      },
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify session",
        details: error.message,
        type: error.name || "UnknownError",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
