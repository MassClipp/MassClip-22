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

    // Retrieve session from Stripe
    console.log("💳 [Verify Session] Retrieving Stripe session:", sessionId)
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      })
      console.log("✅ [Verify Session] Session retrieved successfully:")
      console.log("   ID:", session.id)
      console.log("   Payment Status:", session.payment_status)
      console.log("   Status:", session.status)
      console.log("   Amount:", session.amount_total)
      console.log("   Currency:", session.currency)
      console.log("   Customer Email:", session.customer_details?.email)
      console.log("   Metadata:", session.metadata)
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve session:", error)
      return NextResponse.json(
        {
          error: "Invalid session ID",
          details: error.message,
        },
        { status: 400 },
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
    const sessionUserId = session.metadata?.userId
    const creatorId = session.metadata?.creatorId

    if (!productBoxId) {
      console.error("❌ [Verify Session] Missing productBoxId in session metadata")
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    // Use authenticated user ID if available, otherwise use session metadata
    const finalUserId = userId || sessionUserId

    console.log("📦 [Verify Session] Processing purchase:")
    console.log("   Product Box ID:", productBoxId)
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
      const purchaseData = {
        sessionId,
        productBoxId,
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
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      purchaseId = purchaseRef.id
      console.log("✅ [Verify Session] Purchase record created:", purchaseId)

      // Grant user access if we have a user ID
      if (finalUserId) {
        console.log("🔓 [Verify Session] Granting user access...")
        try {
          // Add to user's purchases subcollection
          await db.collection("users").doc(finalUserId).collection("purchases").doc(purchaseId).set({
            productBoxId,
            purchaseId,
            sessionId,
            amount: session.amount_total,
            purchasedAt: new Date(),
            status: "active",
          })

          // Also update user's main document with purchase info
          await db
            .collection("users")
            .doc(finalUserId)
            .update({
              [`productBoxAccess.${productBoxId}`]: {
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

      // Update product box stats
      try {
        await db
          .collection("productBoxes")
          .doc(productBoxId)
          .update({
            "stats.totalSales": db.FieldValue.increment(1),
            "stats.totalRevenue": db.FieldValue.increment(session.amount_total || 0),
            "stats.lastSaleAt": new Date(),
            updatedAt: new Date(),
          })
        console.log("✅ [Verify Session] Product box stats updated")
      } catch (error) {
        console.error("❌ [Verify Session] Failed to update product box stats:", error)
      }
    }

    // Get product box details for response
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    const productBox = productBoxDoc.exists ? productBoxDoc.data() : {}

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
      },
      purchase: {
        id: purchaseId,
        productBoxId,
        userId: finalUserId,
        amount: session.amount_total || 0,
      },
      productBox: {
        title: productBox?.title || "Product Box",
        description: productBox?.description,
      },
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
