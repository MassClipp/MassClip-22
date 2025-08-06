import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
      console.error("❌ [Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("✅ [Webhook] Received event:", event.type, event.id)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log("🔍 [Webhook] Processing checkout session:", session.id)
      console.log("📋 [Webhook] Session metadata:", session.metadata)

      // Extract metadata
      const buyerUid = session.metadata?.buyerUid
      const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
      const itemType = session.metadata?.itemType || "bundle"
      const creatorId = session.metadata?.creatorId

      if (!buyerUid || !bundleId || !creatorId) {
        console.error("❌ [Webhook] Missing required metadata:", { buyerUid, bundleId, creatorId })
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      // Verify the creator has a connected Stripe account
      const creatorAccountDoc = await adminDb.collection("connectedStripeAccounts").doc(creatorId).get()
      
      if (!creatorAccountDoc.exists) {
        console.error("❌ [Webhook] Creator has no connected Stripe account:", creatorId)
        return NextResponse.json({ error: "Creator account not found" }, { status: 404 })
      }

      const creatorAccountData = creatorAccountDoc.data()!
      const expectedStripeAccountId = creatorAccountData.stripeAccountId

      // Verify the session came from the correct connected account
      if (session.account !== expectedStripeAccountId) {
        console.error("❌ [Webhook] Session account mismatch:", {
          sessionAccount: session.account,
          expectedAccount: expectedStripeAccountId
        })
        return NextResponse.json({ error: "Account mismatch" }, { status: 400 })
      }

      console.log(`✅ [Webhook] Verified session from connected account: ${expectedStripeAccountId}`)

      // Look up the bundle/item in Firestore
      let itemData: any = null
      let creatorData: any = null

      try {
        // Try bundles collection first
        const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          itemData = { id: bundleDoc.id, ...bundleDoc.data() }
          console.log("✅ [Webhook] Found bundle:", itemData.title)
        } else {
          // Try productBoxes collection
          const productBoxDoc = await adminDb.collection("productBoxes").doc(bundleId).get()
          if (productBoxDoc.exists) {
            itemData = { id: productBoxDoc.id, ...productBoxDoc.data() }
            console.log("✅ [Webhook] Found product box:", itemData.title)
          }
        }

        if (!itemData) {
          console.error("❌ [Webhook] Item not found:", bundleId)
          return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        // Look up creator data from users collection (for display info)
        const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
          console.log("✅ [Webhook] Found creator:", creatorData.displayName || creatorData.username)
        }
      } catch (error) {
        console.error("❌ [Webhook] Error looking up item/creator:", error)
        return NextResponse.json({ error: "Database lookup failed" }, { status: 500 })
      }

      // Create purchase record in bundlePurchases collection
      const purchaseData = {
        // Purchase identifiers
        sessionId: session.id,
        paymentIntentId: session.payment_intent,

        // Buyer information
        buyerUid: buyerUid,
        buyerEmail: session.customer_details?.email || "",
        buyerName: session.customer_details?.name || "",

        // Item information
        itemId: bundleId,
        itemType: itemType,
        bundleId: itemType === "bundle" ? bundleId : null,
        productBoxId: itemType === "product_box" ? bundleId : null,
        title: itemData.title || "Untitled",
        description: itemData.description || "",
        thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",
        downloadUrl: itemData.downloadUrl || "",
        fileSize: itemData.fileSize || 0,
        fileType: itemData.fileType || "",
        duration: itemData.duration || 0,

        // Creator information (from connectedStripeAccounts)
        creatorId: creatorId,
        creatorStripeAccountId: expectedStripeAccountId,
        creatorName: creatorData?.displayName || creatorData?.username || "Unknown Creator",
        creatorUsername: creatorData?.username || "",

        // Purchase details
        amount: (session.amount_total || 0) / 100, // Convert from cents
        currency: session.currency || "usd",
        status: "completed",

        // Access information
        accessUrl: itemType === "bundle" ? `/bundles/${bundleId}` : `/product-box/${bundleId}/content`,
        accessGranted: true,
        downloadCount: 0,

        // Timestamps
        purchasedAt: new Date(),
        createdAt: new Date(),

        // Environment
        environment: process.env.NODE_ENV === "production" ? "live" : "test",
      }

      try {
        // Write to bundlePurchases collection
        await adminDb.collection("bundlePurchases").doc(session.id).set(purchaseData)
        console.log("✅ [Webhook] Created purchase record in bundlePurchases:", session.id)

        // Update creator's sales stats in users collection (for backward compatibility)
        if (creatorData) {
          const creatorRef = adminDb.collection("users").doc(creatorId)
          await creatorRef.update({
            totalSales: (creatorData.totalSales || 0) + purchaseData.amount,
            totalPurchases: (creatorData.totalPurchases || 0) + 1,
            lastSaleAt: new Date(),
          })
          console.log("✅ [Webhook] Updated creator sales stats in users collection")
        }

        // Update item download/purchase count
        const itemRef =
          itemType === "bundle" ? adminDb.collection("bundles").doc(bundleId) : adminDb.collection("productBoxes").doc(bundleId)

        await itemRef.update({
          downloadCount: (itemData.downloadCount || 0) + 1,
          lastPurchaseAt: new Date(),
        })
        console.log("✅ [Webhook] Updated item stats")

      } catch (error) {
        console.error("❌ [Webhook] Error creating purchase record:", error)
        return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 })
      }

      console.log("🎉 [Webhook] Purchase processing completed successfully")
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
