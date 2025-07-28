import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
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
        // Don't return error here - allow anonymous verification
        console.log("⚠️ [Verify Session] Continuing without authentication...")
      }
    }

    // Enhanced session retrieval with better error handling
    console.log("💳 [Verify Session] Retrieving Stripe session:", sessionId)
    console.log("   Stripe mode:", process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST")
    console.log("   Session ID prefix:", sessionId.substring(0, 8))

    let session
    try {
      // First, try to retrieve the session with expanded payment_intent
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })
      console.log("✅ [Verify Session] Session retrieved successfully:")
      console.log("   ID:", session.id)
      console.log("   Payment Status:", session.payment_status)
      console.log("   Status:", session.status)
      console.log("   Amount:", session.amount_total)
      console.log("   Currency:", session.currency)
      console.log("   Customer Email:", session.customer_details?.email)
      console.log("   Metadata:", session.metadata)
      console.log("   Created:", new Date(session.created * 1000).toISOString())
      console.log(
        "   Expires At:",
        session.expires_at ? new Date(session.expires_at * 1000).toISOString() : "No expiration",
      )
      console.log("   Mode:", session.mode)
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve session:", error)

      // Enhanced error handling for different Stripe error types
      if (error.type === "StripeInvalidRequestError") {
        if (error.message?.includes("No such checkout.session")) {
          console.error("❌ [Verify Session] Session not found in Stripe")

          // Check if this might be a test/live mode mismatch
          const isLiveSession = sessionId.startsWith("cs_live_")
          const isTestSession = sessionId.startsWith("cs_test_")
          const currentMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test"
          const currentKeyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "unknown"

          console.log("🔍 [Verify Session] Mode analysis:", {
            sessionId: sessionId.substring(0, 20) + "...",
            isLiveSession,
            isTestSession,
            currentMode,
            currentKeyPrefix,
            stripeKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
          })

          if ((isLiveSession && currentMode === "test") || (isTestSession && currentMode === "live")) {
            return NextResponse.json(
              {
                error: "Session mode mismatch",
                details: `Session is from ${isLiveSession ? "live" : "test"} mode but API is in ${currentMode} mode`,
                sessionId,
                currentMode,
                sessionMode: isLiveSession ? "live" : "test",
                stripeKeyPrefix: currentKeyPrefix,
                suggestion: "Verify you're using the correct Stripe keys for your environment",
              },
              { status: 400 },
            )
          }

          return NextResponse.json(
            {
              error: "Session not found",
              details: "This checkout session does not exist in Stripe or has been deleted",
              sessionId,
              sessionPrefix: sessionId.substring(0, 8),
              stripeMode: currentMode,
              possibleCauses: [
                "Session ID is incorrect or truncated",
                "Session was never created",
                "Using wrong Stripe account",
                "Session was created in different mode (test vs live)",
                "Session has been deleted from Stripe dashboard",
              ],
              suggestion: "Please verify the session ID and try making a new purchase",
            },
            { status: 404 },
          )
        }
      }

      // Network or other errors
      return NextResponse.json(
        {
          error: "Failed to retrieve session",
          details: error.message,
          type: error.type || "unknown",
          sessionId,
          stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
          timestamp: new Date().toISOString(),
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
    const creatorId = session.metadata?.creatorId

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
    console.log("   Creator ID:", creatorId)

    // Check if purchase already exists
    console.log("🔍 [Verify Session] Checking for existing purchase...")
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

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
        creatorId: creatorId || null,
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
      },
      purchase: {
        id: purchaseId,
        productBoxId: productBoxId || null,
        bundleId: bundleId || null,
        itemId: docId,
        itemType: productBoxId ? "product_box" : "bundle",
        userId: finalUserId,
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
