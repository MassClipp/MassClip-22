import { type NextRequest, NextResponse } from "next/server"
import { retrieveStripeSession } from "@/lib/stripe"
import { db } from "@/lib/firebase-server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, bundleId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Purchase Verification] Verifying session ${sessionId} for user ${session.user.id}`)

    // Retrieve the Stripe session
    let stripeSession
    try {
      // First try to get the bundle to find the connected account
      let connectedAccountId
      if (bundleId) {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          const bundleData = bundleDoc.data()
          connectedAccountId = bundleData?.creatorStripeAccountId
        }
      }

      stripeSession = await retrieveStripeSession(sessionId, connectedAccountId)
    } catch (error: any) {
      console.error(`❌ [Purchase Verification] Failed to retrieve Stripe session:`, error)
      return NextResponse.json(
        {
          error: "Failed to verify payment session",
          details: error.message,
        },
        { status: 400 },
      )
    }

    // Check if payment was successful
    if (stripeSession.payment_status !== "paid") {
      console.log(`⚠️ [Purchase Verification] Payment not completed. Status: ${stripeSession.payment_status}`)
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: stripeSession.payment_status,
        },
        { status: 400 },
      )
    }

    // Extract bundle ID from metadata if not provided
    const finalBundleId = bundleId || stripeSession.metadata?.bundleId
    if (!finalBundleId) {
      console.error(`❌ [Purchase Verification] No bundle ID found in session or metadata`)
      return NextResponse.json({ error: "Bundle ID not found" }, { status: 400 })
    }

    // Check if purchase already exists
    const existingPurchase = await db
      .collection("purchases")
      .where("userId", "==", session.user.id)
      .where("bundleId", "==", finalBundleId)
      .where("stripeSessionId", "==", sessionId)
      .get()

    if (!existingPurchase.empty) {
      console.log(`✅ [Purchase Verification] Purchase already exists`)
      return NextResponse.json({
        success: true,
        message: "Purchase already verified",
        purchaseId: existingPurchase.docs[0].id,
      })
    }

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(finalBundleId).get()
    if (!bundleDoc.exists) {
      console.error(`❌ [Purchase Verification] Bundle not found: ${finalBundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    // Get bundle content
    const contentSnapshot = await db.collection("bundles").doc(finalBundleId).collection("content").get()

    const contentItems = contentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Create purchase record
    const purchaseData = {
      userId: session.user.id,
      bundleId: finalBundleId,
      bundleTitle: bundleData?.title || "Unknown Bundle",
      bundleDescription: bundleData?.description || "",
      bundleThumbnail: bundleData?.thumbnail || "",
      creatorId: bundleData?.creatorId || "",
      creatorUsername: bundleData?.creatorUsername || "",
      stripeSessionId: sessionId,
      stripePaymentIntentId: stripeSession.payment_intent,
      amount: stripeSession.amount_total || 0,
      currency: stripeSession.currency || "usd",
      status: "completed",
      purchaseDate: new Date(),
      contentItems: contentItems,
      metadata: {
        stripeCustomerId: stripeSession.customer,
        paymentMethod: stripeSession.payment_method_types?.[0] || "unknown",
        mode: stripeSession.mode || "payment",
      },
    }

    const purchaseRef = await db.collection("purchases").add(purchaseData)

    console.log(`✅ [Purchase Verification] Purchase created: ${purchaseRef.id}`)

    // Update bundle sales count
    await db
      .collection("bundles")
      .doc(finalBundleId)
      .update({
        salesCount: (bundleData?.salesCount || 0) + 1,
        lastSaleDate: new Date(),
      })

    // Track the purchase for analytics
    try {
      await db.collection("analytics").doc("purchases").collection("events").add({
        type: "purchase_completed",
        userId: session.user.id,
        bundleId: finalBundleId,
        amount: stripeSession.amount_total,
        timestamp: new Date(),
        sessionId: sessionId,
      })
    } catch (analyticsError) {
      console.error("Failed to track purchase analytics:", analyticsError)
      // Don't fail the purchase for analytics errors
    }

    return NextResponse.json({
      success: true,
      message: "Purchase verified successfully",
      purchaseId: purchaseRef.id,
      bundleId: finalBundleId,
      contentItems: contentItems.length,
    })
  } catch (error: any) {
    console.error(`❌ [Purchase Verification] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
