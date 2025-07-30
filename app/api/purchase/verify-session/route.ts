import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb, auth } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("[Purchase Success] Starting verification...")

    const { sessionId } = await request.json()

    if (!sessionId) {
      console.log("[Purchase Success] No session ID provided")
      return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 })
    }

    console.log("[Purchase Success] Session ID:", sessionId)

    // Get auth token from headers
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      console.log("[Purchase Success] No auth token provided")
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("[Purchase Success] User authenticated:", decodedToken.uid)
    } catch (error) {
      console.error("[Purchase Success] Token verification failed:", error)
      return NextResponse.json({ success: false, error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const db = getAdminDb()

    // Retrieve the session from Stripe
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
      })
      console.log("[Purchase Success] Session retrieved from Stripe")
    } catch (error) {
      console.error("[Purchase Success] Failed to retrieve session:", error)
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 })
    }

    console.log("[Purchase Success] Session payment status:", session.payment_status)
    console.log("[Purchase Success] Session metadata:", session.metadata)

    if (session.payment_status !== "paid") {
      console.log("[Purchase Success] Payment not completed")
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 })
    }

    // Extract bundle ID from metadata
    const bundleId = session.metadata?.bundleId || session.metadata?.bundle_id
    console.log("[Purchase Success] Bundle ID from metadata:", bundleId)

    if (!bundleId) {
      console.error("[Purchase Success] No bundle ID found in session metadata")
      return NextResponse.json({ success: false, error: "Bundle information missing" }, { status: 400 })
    }

    // Check if purchase already exists
    const existingPurchaseQuery = await db
      .collection("purchases")
      .where("userId", "==", userId)
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty) {
      console.log("[Purchase Success] Purchase already processed")
      const existingPurchase = existingPurchaseQuery.docs[0].data()

      // Get bundle details for response
      let bundleData = null
      try {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          bundleData = { id: bundleDoc.id, ...bundleDoc.data() }
          console.log("[Purchase Success] Bundle data retrieved for existing purchase")
        }
      } catch (error) {
        console.error("[Purchase Success] Error fetching bundle for existing purchase:", error)
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
        },
        purchase: existingPurchase,
        item: bundleData,
      })
    }

    // Fetch bundle details from database
    let bundleData
    try {
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (!bundleDoc.exists) {
        console.error("[Purchase Success] Bundle not found:", bundleId)
        return NextResponse.json({ success: false, error: "Bundle not found" }, { status: 404 })
      }

      bundleData = { id: bundleDoc.id, ...bundleDoc.data() }
      console.log("[Purchase Success] Bundle data retrieved:", {
        id: bundleData.id,
        title: bundleData.title,
        creatorId: bundleData.creatorId,
      })
    } catch (error) {
      console.error("[Purchase Success] Error fetching bundle:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch bundle details" }, { status: 500 })
    }

    // Get creator information
    let creatorData = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creator = creatorDoc.data()
          creatorData = {
            id: creatorDoc.id,
            username: creator?.username,
            displayName: creator?.displayName,
            profilePicture: creator?.profilePicture,
          }
        }
      } catch (error) {
        console.error("[Purchase Success] Error fetching creator:", error)
      }
    }

    // Create purchase record
    const purchaseData = {
      userId,
      bundleId,
      stripeSessionId: sessionId,
      stripePaymentIntentId: session.payment_intent?.id || null,
      amount: session.amount_total,
      currency: session.currency,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
      bundleTitle: bundleData.title,
      bundleDescription: bundleData.description,
      creatorId: bundleData.creatorId,
      creatorUsername: creatorData?.username,
      type: "bundle",
    }

    try {
      console.log("[Purchase Success] Creating purchase record...")
      const purchaseRef = await db.collection("purchases").add(purchaseData)
      console.log("[Purchase Success] Purchase record created:", purchaseRef.id)

      // Also create in unified purchases for compatibility
      try {
        await db.collection("unifiedPurchases").add({
          ...purchaseData,
          purchaseId: purchaseRef.id,
          type: "bundle",
        })
        console.log("[Purchase Success] Unified purchase record created")
      } catch (error) {
        console.error("[Purchase Success] Error creating unified purchase:", error)
      }

      // Grant access to bundle content
      try {
        await db.collection("userAccess").doc(`${userId}_${bundleId}`).set({
          userId,
          bundleId,
          accessType: "bundle",
          grantedAt: new Date(),
          purchaseId: purchaseRef.id,
          stripeSessionId: sessionId,
        })
        console.log("[Purchase Success] Access granted to bundle content")
      } catch (error) {
        console.error("[Purchase Success] Error granting access:", error)
      }

      console.log("[Purchase Success] Verification complete - success!")

      return NextResponse.json({
        success: true,
        alreadyProcessed: false,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
        },
        purchase: {
          id: purchaseRef.id,
          ...purchaseData,
        },
        item: {
          ...bundleData,
          creator: creatorData,
        },
      })
    } catch (error) {
      console.error("[Purchase Success] Error creating purchase record:", error)
      return NextResponse.json({ success: false, error: "Failed to create purchase record" }, { status: 500 })
    }
  } catch (error) {
    console.error("[Purchase Success] Verification error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
