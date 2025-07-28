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
    console.log(
      "🔍 [Verify Session] Using Stripe key type:",
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST",
    )

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

    // Retrieve session from Stripe - NO WEBHOOK LOGIC, DIRECT LOOKUP ONLY
    console.log("💳 [Verify Session] Retrieving Stripe session directly:", sessionId)
    let session
    try {
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
      console.log("   Mode:", session.mode)
      console.log("   Created:", new Date(session.created * 1000))
      console.log("   Expires:", new Date(session.expires_at * 1000))
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve session from Stripe:", {
        error: error.message,
        type: error.type,
        code: error.code,
        sessionId,
        stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      })
      return NextResponse.json(
        {
          error: "Session not found in Stripe",
          details: error.message,
          sessionId,
          stripeError: {
            type: error.type,
            code: error.code,
            message: error.message,
          },
          environment: {
            stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
            nodeEnv: process.env.NODE_ENV,
          },
        },
        { status: 404 },
      )
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Session] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          paymentStatus: session.payment_status,
          sessionStatus: session.status,
        },
        { status: 400 },
      )
    }

    const productBoxId = session.metadata?.productBoxId
    const bundleId = session.metadata?.bundleId
    const sessionUserId = session.metadata?.userId || session.metadata?.buyerUid
    const creatorId = session.metadata?.creatorId || session.metadata?.creatorUid

    if (!productBoxId && !bundleId) {
      console.error("❌ [Verify Session] Missing product/bundle ID in session metadata")
      return NextResponse.json({ error: "Invalid session metadata - no product or bundle ID" }, { status: 400 })
    }

    // Use authenticated user ID if available, otherwise use session metadata
    const finalUserId = userId || sessionUserId

    console.log("📦 [Verify Session] Processing purchase:")
    console.log("   Product Box ID:", productBoxId)
    console.log("   Bundle ID:", bundleId)
    console.log("   Final User ID:", finalUserId)
    console.log("   Creator ID:", creatorId)

    // Check if purchase already exists - SKIP WEBHOOK LOGIC
    console.log("🔍 [Verify Session] Checking for existing purchase...")
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    let purchaseId
    let alreadyProcessed = false

    if (!existingPurchaseQuery.empty) {
      console.log("ℹ️ [Verify Session] Purchase already exists (processed manually or by webhook)")
      purchaseId = existingPurchaseQuery.docs[0].id
      alreadyProcessed = true
    } else {
      // Create new purchase record - MANUAL PROCESSING ONLY
      console.log("💾 [Verify Session] Creating new purchase record via manual verification...")

      const itemId = productBoxId || bundleId
      const itemType = productBoxId ? "product_box" : "bundle"

      const purchaseData = {
        sessionId,
        productBoxId: productBoxId || null,
        bundleId: bundleId || null,
        itemId,
        itemType,
        userId: finalUserId,
        buyerUid: finalUserId,
        creatorId: creatorId || null,
        creatorUid: creatorId || null,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        status: "completed",
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email || null,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        purchasedAt: new Date(),
        stripeSessionId: sessionId,
        verificationMethod: "manual_verification_only", // NO WEBHOOK
        verifiedAt: new Date(),
        environment: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
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
              amount: session.amount_total ? session.amount_total / 100 : 0,
              purchasedAt: new Date(),
              status: "active",
              verificationMethod: "manual_only",
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
                verificationMethod: "manual_only",
              },
              updatedAt: new Date(),
            })

          console.log("✅ [Verify Session] User access granted")
        } catch (error) {
          console.error("❌ [Verify Session] Failed to grant user access:", error)
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
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
            lastSaleAt: new Date(),
            updatedAt: new Date(),
          })
        console.log(`✅ [Verify Session] ${itemType} stats updated`)
      } catch (error) {
        console.error(`❌ [Verify Session] Failed to update ${itemType} stats:`, error)
      }

      // Record sale for creator
      if (creatorId) {
        try {
          await db
            .collection("users")
            .doc(creatorId)
            .collection("sales")
            .add({
              productBoxId: productBoxId || null,
              bundleId: bundleId || null,
              buyerUid: finalUserId,
              sessionId: session.id,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
              netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
              purchasedAt: new Date(),
              status: "completed",
              customerEmail: session.customer_details?.email || "",
              verificationMethod: "manual_only",
              environment: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
            })

          await db
            .collection("users")
            .doc(creatorId)
            .update({
              totalSales: db.FieldValue.increment(1),
              totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
              lastSaleAt: new Date(),
            })

          console.log("✅ [Verify Session] Creator sale recorded")
        } catch (error) {
          console.error("❌ [Verify Session] Failed to record creator sale:", error)
        }
      }
    }

    // Get item details for response
    const collection = productBoxId ? "productBoxes" : "bundles"
    const docId = productBoxId || bundleId
    const itemDoc = await db.collection(collection).doc(docId!).get()
    const itemData = itemDoc.exists ? itemDoc.data() : {}

    console.log("✅ [Verify Session] Manual verification completed successfully")

    return NextResponse.json({
      success: true,
      alreadyProcessed,
      verificationMethod: "manual_only", // NO WEBHOOK
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
        mode: session.mode,
        created: session.created,
        expires_at: session.expires_at,
      },
      purchase: {
        id: purchaseId,
        productBoxId: productBoxId || null,
        bundleId: bundleId || null,
        itemId: docId,
        itemType: productBoxId ? "product_box" : "bundle",
        userId: finalUserId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
      },
      item: {
        title: itemData?.title || `${productBoxId ? "Product Box" : "Bundle"}`,
        description: itemData?.description,
        type: productBoxId ? "product_box" : "bundle",
      },
      environment: {
        stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Manual verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify session",
        details: error.message,
        verificationMethod: "manual_only",
      },
      { status: 500 },
    )
  }
}
