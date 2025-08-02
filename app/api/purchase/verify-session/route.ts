import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { retrieveSessionSmart } from "@/lib/stripe"
import { getAdminDb } from "@/lib/firebase-server"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Verify Session] Processing session:", sessionId)

    const db = getAdminDb()

    // Check if we already have this purchase processed
    console.log("🔍 [Verify Session] Checking for existing purchase record...")
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchaseQuery.empty) {
      const existingPurchase = existingPurchaseQuery.docs[0].data()
      console.log("✅ [Verify Session] Purchase already processed:", existingPurchase.id)

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: existingPurchase,
        message: "Purchase already verified and processed",
      })
    }

    // Strategy: Find the correct Stripe account by checking connected accounts
    console.log("🔍 [Verify Session] Finding correct Stripe account...")

    const connectedAccounts = []
    const usersWithStripeQuery = await db.collection("users").where("stripeAccountId", "!=", null).get()

    usersWithStripeQuery.forEach((doc) => {
      const userData = doc.data()
      if (userData.stripeAccountId) {
        connectedAccounts.push({
          accountId: userData.stripeAccountId,
          userId: doc.id,
          username: userData.username || userData.displayName || "Unknown",
        })
      }
    })

    console.log(`🔍 [Verify Session] Found ${connectedAccounts.length} connected accounts to search`)

    let session: any = null
    let connectedAccountId: string | undefined = undefined
    let creatorId: string | undefined = undefined

    // Try each connected account to find the session
    for (const account of connectedAccounts) {
      try {
        console.log(`🔍 [Verify Session] Trying connected account: ${account.accountId} (${account.username})`)

        session = await retrieveSessionSmart(sessionId, account.accountId)

        if (session) {
          console.log(`✅ [Verify Session] Found session in connected account: ${account.accountId}`)
          connectedAccountId = account.accountId
          creatorId = account.userId
          break
        }
      } catch (error: any) {
        console.log(`⚠️ [Verify Session] Account ${account.accountId} failed: ${error.message}`)
        continue
      }
    }

    // If not found in connected accounts, try platform account
    if (!session) {
      try {
        console.log("🔍 [Verify Session] Trying platform account...")
        session = await retrieveSessionSmart(sessionId)
        console.log("✅ [Verify Session] Found session in platform account")
      } catch (error: any) {
        console.error("❌ [Verify Session] Session not found in any account:", error)
        return NextResponse.json(
          {
            error: "Session not found",
            details: "This checkout session could not be found in any Stripe account.",
            sessionId,
          },
          { status: 404 },
        )
      }
    }

    // Validate session payment status
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

    console.log("✅ [Verify Session] Session retrieved successfully:")
    console.log("   ID:", session.id)
    console.log("   Payment Status:", session.payment_status)
    console.log("   Metadata:", session.metadata)

    // CRITICAL: Extract buyer info from Stripe metadata (not from frontend)
    const {
      buyerUid,
      buyerEmail,
      buyerName,
      bundleId,
      productBoxId,
      creatorId: metadataCreatorId,
      contentType,
      isAuthenticated,
    } = session.metadata || {}

    console.log("📋 [Verify Session] Extracted buyer info from metadata:", {
      buyerUid,
      buyerEmail,
      buyerName,
      isAuthenticated,
      contentType,
    })

    if (!buyerUid) {
      console.error("❌ [Verify Session] No buyer UID found in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session metadata",
          details: "No buyer identification found in session metadata",
          metadata: session.metadata,
        },
        { status: 400 },
      )
    }

    // Determine item details
    const itemId = bundleId || productBoxId
    const finalCreatorId = metadataCreatorId || creatorId

    if (!itemId) {
      console.error("❌ [Verify Session] No item ID found in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session metadata",
          details: "No bundle or product box ID found in session metadata",
          metadata: session.metadata,
        },
        { status: 400 },
      )
    }

    console.log("📦 [Verify Session] Processing purchase for:", {
      buyerUid,
      itemId,
      contentType,
      creatorId: finalCreatorId,
    })

    // Create unified purchase record
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      [contentType === "bundle" ? "bundleId" : "productBoxId"]: itemId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: finalCreatorId || "",
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || "User",
    })

    // Create main purchase record
    const purchaseData = {
      // Buyer identification from metadata
      userId: buyerUid,
      buyerUid,
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || "User",
      isAuthenticated: isAuthenticated === "true",

      // Item identification
      [contentType === "bundle" ? "bundleId" : "productBoxId"]: itemId,
      itemId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,

      // Purchase details
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: contentType || "product_box",

      // Creator and account info
      creatorId: finalCreatorId,
      connectedAccountId: connectedAccountId || null,

      // Verification details
      verificationMethod: "metadata_extraction",
      verifiedAt: new Date(),
    }

    // Save purchase record
    await db.collection("purchases").doc(session.id).set(purchaseData)

    // Grant user access if authenticated
    if (buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
      console.log("🔓 [Verify Session] Granting user access...")

      try {
        // Add to user's purchases subcollection
        await db
          .collection("users")
          .doc(buyerUid)
          .collection("purchases")
          .doc(session.id)
          .set({
            [contentType === "bundle" ? "bundleId" : "productBoxId"]: itemId,
            itemId,
            itemType: contentType || "product_box",
            purchaseId: session.id,
            sessionId: session.id,
            amount: session.amount_total || 0,
            purchasedAt: new Date(),
            status: "active",
          })

        // Update user's main document with access
        const accessField = contentType === "bundle" ? "bundleAccess" : "productBoxAccess"
        await db
          .collection("users")
          .doc(buyerUid)
          .update({
            [`${accessField}.${itemId}`]: {
              purchaseId: session.id,
              sessionId: session.id,
              grantedAt: new Date(),
              accessType: "purchased",
            },
            updatedAt: new Date(),
          })

        console.log("✅ [Verify Session] User access granted successfully")
      } catch (error) {
        console.error("❌ [Verify Session] Failed to grant user access:", error)
      }
    }

    // Get item details for response
    const itemCollection = contentType === "bundle" ? "bundles" : "productBoxes"
    const itemDoc = await db.collection(itemCollection).doc(itemId).get()
    const itemData = itemDoc.exists ? itemDoc.data() : {}

    // Get creator details
    let creatorData = {}
    if (finalCreatorId) {
      const creatorDoc = await db.collection("users").doc(finalCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : {}
    }

    console.log("✅ [Verify Session] Verification completed successfully")

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        payment_status: session.payment_status,
        customerEmail: session.customer_details?.email,
        created: new Date(session.created * 1000).toISOString(),
      },
      purchase: purchaseData,
      item: {
        id: itemId,
        title: itemData?.title || "Purchased Item",
        description: itemData?.description || "",
        thumbnailUrl: itemData?.thumbnailUrl || "",
        creator: {
          id: finalCreatorId,
          name: creatorData?.displayName || creatorData?.name || "Creator",
          username: creatorData?.username || "",
        },
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
