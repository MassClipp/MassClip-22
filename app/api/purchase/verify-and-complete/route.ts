import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, idToken } = await request.json()

    if (!sessionId || !productBoxId) {
      return NextResponse.json({ error: "Session ID and Product Box ID are required" }, { status: 400 })
    }

    // Verify Firebase ID token if provided
    let userId: string | null = null
    let userEmail: string | null = null

    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email || null
        console.log(`✅ [Purchase Verify] Token verified for user: ${userId}`)
      } catch (tokenError) {
        console.error("❌ [Purchase Verify] Token verification failed:", tokenError)
        // Continue without user ID for guest purchases
      }
    }

    // Retrieve the Stripe session
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "customer"],
      })
      console.log(`✅ [Purchase Verify] Stripe session retrieved: ${session.id}`)
    } catch (stripeError) {
      console.error("❌ [Purchase Verify] Failed to retrieve Stripe session:", stripeError)
      return NextResponse.json({ error: "Invalid or expired session ID" }, { status: 400 })
    }

    // Verify session is completed
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Verify the product box ID matches
    const sessionProductBoxId = session.metadata?.productBoxId
    if (sessionProductBoxId !== productBoxId) {
      return NextResponse.json({ error: "Product Box ID mismatch" }, { status: 400 })
    }

    // Get customer email from Stripe if not from token
    const customerEmail =
      userEmail ||
      (typeof session.customer_details?.email === "string" ? session.customer_details.email : null) ||
      (session.customer && typeof session.customer === "object" && "email" in session.customer
        ? session.customer.email
        : null)

    // If we have a user ID, match it with the session
    if (userId && session.metadata?.userId && session.metadata.userId !== userId) {
      console.warn(`⚠️ [Purchase Verify] User ID mismatch: token=${userId}, session=${session.metadata.userId}`)
    }

    // Use the user ID from the session metadata if available, otherwise use token user ID
    const finalUserId = userId || session.metadata?.userId || null

    // Get product box details
    let productBoxDoc
    try {
      productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (!productBoxDoc.exists) {
        return NextResponse.json({ error: "Product box not found" }, { status: 404 })
      }
    } catch (dbError) {
      console.error("❌ [Purchase Verify] Failed to get product box:", dbError)
      return NextResponse.json({ error: "Failed to verify product" }, { status: 500 })
    }

    const productBoxData = productBoxDoc.data()

    // Check if purchase already exists
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    let purchaseId: string
    let purchaseData: any

    if (!existingPurchaseQuery.empty) {
      // Purchase already exists
      const existingPurchase = existingPurchaseQuery.docs[0]
      purchaseId = existingPurchase.id
      purchaseData = existingPurchase.data()
      console.log(`✅ [Purchase Verify] Existing purchase found: ${purchaseId}`)
    } else {
      // Create new purchase record
      const purchaseRef = db.collection("purchases").doc()
      purchaseId = purchaseRef.id

      purchaseData = {
        id: purchaseId,
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        productBoxId,
        userId: finalUserId,
        customerEmail,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: {
          stripeSessionId: session.id,
          productBoxTitle: productBoxData?.title,
          creatorId: productBoxData?.creatorId,
          connectedAccountId: session.metadata?.connectedAccountId,
        },
      }

      try {
        await purchaseRef.set(purchaseData)
        console.log(`✅ [Purchase Verify] Purchase record created: ${purchaseId}`)
      } catch (dbError) {
        console.error("❌ [Purchase Verify] Failed to create purchase record:", dbError)
        return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
      }
    }

    // Grant access to the user if we have a user ID
    if (finalUserId) {
      try {
        const userRef = db.collection("users").doc(finalUserId)
        await userRef.update({
          [`productBoxAccess.${productBoxId}`]: {
            purchaseId,
            sessionId: session.id,
            grantedAt: FieldValue.serverTimestamp(),
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
          },
          updatedAt: FieldValue.serverTimestamp(),
        })
        console.log(`✅ [Purchase Verify] Access granted to user: ${finalUserId}`)
      } catch (accessError) {
        console.error("❌ [Purchase Verify] Failed to grant access:", accessError)
        // Don't fail the entire request if access granting fails
      }
    }

    // Update product box sales stats
    try {
      await db
        .collection("productBoxes")
        .doc(productBoxId)
        .update({
          "stats.totalSales": FieldValue.increment(1),
          "stats.totalRevenue": FieldValue.increment(session.amount_total || 0),
          "stats.lastSaleAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      console.log(`✅ [Purchase Verify] Product box stats updated`)
    } catch (statsError) {
      console.error("❌ [Purchase Verify] Failed to update stats:", statsError)
      // Don't fail the entire request if stats update fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: session.payment_status,
        customer_email: customerEmail,
        payment_intent:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      },
      purchase: {
        productBoxId,
        userId: finalUserId,
        connectedAccountId: session.metadata?.connectedAccountId,
        purchaseId,
      },
      productBox: {
        title: productBoxData?.title,
        description: productBoxData?.description,
        creatorId: productBoxData?.creatorId,
      },
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify and complete purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
