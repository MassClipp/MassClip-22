import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-server"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"
import type { FirebaseFirestore } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Purchase Verification] Starting verification process")

    const body = await request.json()
    const { sessionId, userId } = body

    console.log(`🔍 [Purchase Verification] Verifying session: ${sessionId} for user: ${userId}`)

    if (!sessionId) {
      console.error("❌ [Purchase Verification] No session ID provided")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ [Purchase Verification] Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 })
    }

    // Get the Stripe session with error handling
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })
      console.log(`📋 [Purchase Verification] Session status: ${session.payment_status}`)
    } catch (stripeError: any) {
      console.error("❌ [Purchase Verification] Stripe error:", stripeError.message)
      return NextResponse.json(
        {
          error: `Failed to retrieve Stripe session: ${stripeError.message}`,
        },
        { status: 400 },
      )
    }

    if (session.payment_status !== "paid") {
      console.log(`⚠️ [Purchase Verification] Payment not completed: ${session.payment_status}`)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract metadata with fallbacks
    const metadata = session.metadata || {}
    const { productBoxId, bundleId, buyerUid, creatorId, contentType } = metadata
    const itemId = bundleId || productBoxId
    const isBundle = contentType === "bundle" || !!bundleId

    console.log(`📦 [Purchase Verification] Item details:`, {
      itemId,
      isBundle,
      contentType,
      buyerUid,
      creatorId,
      metadata,
    })

    if (!itemId) {
      console.error("❌ [Purchase Verification] No product/bundle ID in session metadata")
      return NextResponse.json({ error: "No product/bundle ID in session metadata" }, { status: 400 })
    }

    // Initialize Firebase Admin with error handling
    let db: FirebaseFirestore.Firestore
    try {
      db = getAdminDb()
    } catch (firebaseError: any) {
      console.error("❌ [Purchase Verification] Firebase initialization error:", firebaseError.message)
      return NextResponse.json({ error: "Database connection error" }, { status: 500 })
    }

    // Check if purchase already exists
    try {
      const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

      if (!existingPurchaseQuery.empty) {
        console.log(`✅ [Purchase Verification] Purchase already exists for session: ${sessionId}`)
        const existingPurchase = existingPurchaseQuery.docs[0].data()
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          purchase: existingPurchase,
        })
      }
    } catch (dbError: any) {
      console.error("❌ [Purchase Verification] Database query error:", dbError.message)
      return NextResponse.json({ error: "Database query failed" }, { status: 500 })
    }

    // Continue with the rest of the verification logic...
    // (keeping the existing logic but with better error handling)

    const finalUserId = userId || buyerUid || "anonymous"

    // Get user details with error handling
    let userEmail = ""
    let userName = "User"
    let isAuthenticated = false

    if (finalUserId && finalUserId !== "anonymous") {
      try {
        const userRecord = await getAdminAuth().getUser(finalUserId)
        userEmail = userRecord.email || session.customer_email || ""
        userName = userRecord.displayName || userRecord.email?.split("@")[0] || "User"
        isAuthenticated = true
        console.log(`✅ [Purchase Verification] User verified: ${userName} (${userEmail})`)
      } catch (authError: any) {
        console.warn(`⚠️ [Purchase Verification] Could not verify user: ${finalUserId}`, authError.message)
        userEmail = session.customer_email || ""
        userName = userEmail?.split("@")[0] || "Anonymous User"
      }
    } else {
      userEmail = session.customer_email || ""
      userName = userEmail?.split("@")[0] || "Anonymous User"
    }

    // Get item details with error handling
    const collection = isBundle ? "bundles" : "productBoxes"
    let itemDoc: FirebaseFirestore.DocumentSnapshot
    try {
      itemDoc = await db.collection(collection).doc(itemId).get()
    } catch (dbError: any) {
      console.error(`❌ [Purchase Verification] Error fetching ${collection}:`, dbError.message)
      return NextResponse.json({ error: `Database error fetching ${collection}` }, { status: 500 })
    }

    if (!itemDoc.exists) {
      console.error(`❌ [Purchase Verification] ${collection} not found: ${itemId}`)
      return NextResponse.json({ error: `${collection} not found: ${itemId}` }, { status: 404 })
    }

    const itemData = itemDoc.data()!
    console.log(`📦 [Purchase Verification] Item found: ${itemData.title}`)

    // Get creator details with error handling
    const actualCreatorId = creatorId || itemData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
        creatorData = creatorDoc.exists ? creatorDoc.data() : null
      } catch (creatorError: any) {
        console.warn(`⚠️ [Purchase Verification] Could not fetch creator data:`, creatorError.message)
      }
    }

    // Create unified purchase record with error handling
    try {
      await UnifiedPurchaseService.createUnifiedPurchase(finalUserId, {
        [isBundle ? "bundleId" : "productBoxId"]: itemId,
        sessionId: sessionId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        creatorId: actualCreatorId || "",
        userEmail: userEmail,
        userName: userName,
      })
    } catch (unifiedError: any) {
      console.error("❌ [Purchase Verification] Unified purchase creation failed:", unifiedError.message)
      // Continue with manual creation as fallback
    }

    // Create comprehensive purchase data
    const purchaseData = {
      // User identification
      userId: finalUserId,
      buyerUid: finalUserId,
      userEmail: userEmail,
      userName: userName,
      isAuthenticated: isAuthenticated,

      // Item identification
      [isBundle ? "bundleId" : "productBoxId"]: itemId,
      itemId: itemId,
      sessionId: sessionId,
      paymentIntentId: session.payment_intent,

      // Purchase details
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      status: "completed",
      type: isBundle ? "bundle" : "product_box",

      // Item details
      [isBundle ? "bundleTitle" : "productBoxTitle"]:
        itemData.title || `Untitled ${isBundle ? "Bundle" : "Product Box"}`,
      [isBundle ? "bundleDescription" : "productBoxDescription"]: itemData.description || "",
      thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",

      // Creator details
      creatorId: actualCreatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
      timestamp: new Date(),

      // Verification details
      verificationMethod: "direct_verification",
      verifiedAt: new Date(),
    }

    console.log(`💾 [Purchase Verification] Saving purchase data:`, {
      userId: purchaseData.userId,
      itemId: purchaseData.itemId,
      type: purchaseData.type,
      amount: purchaseData.amount,
    })

    // Save to main purchases collection with error handling
    try {
      await db.collection("purchases").doc(sessionId).set(purchaseData)
      console.log(`✅ [Purchase Verification] Saved to main purchases collection`)
    } catch (saveError: any) {
      console.error("❌ [Purchase Verification] Failed to save to purchases:", saveError.message)
      return NextResponse.json({ error: "Failed to save purchase record" }, { status: 500 })
    }

    // CRITICAL: Save to bundlePurchases collection if it's a bundle
    if (isBundle) {
      console.log(`🎁 [Purchase Verification] Saving to bundlePurchases collection`)

      try {
        // Get bundle contents for comprehensive data
        let bundleContents: any[] = []

        if (itemData.detailedContentItems && Array.isArray(itemData.detailedContentItems)) {
          bundleContents = itemData.detailedContentItems
        } else if (itemData.contents && Array.isArray(itemData.contents)) {
          bundleContents = itemData.contents
        } else if (itemData.contentItems && Array.isArray(itemData.contentItems)) {
          // Fetch detailed content metadata
          for (const contentId of itemData.contentItems) {
            try {
              const uploadDoc = await db.collection("uploads").doc(contentId).get()
              if (uploadDoc.exists) {
                const uploadData = uploadDoc.data()!
                bundleContents.push({
                  id: contentId,
                  title: uploadData.title || uploadData.filename || "Untitled",
                  displayTitle: uploadData.title || uploadData.filename || "Untitled",
                  fileUrl: uploadData.fileUrl || uploadData.publicUrl || "",
                  fileSize: uploadData.fileSize || 0,
                  mimeType: uploadData.mimeType || "application/octet-stream",
                  thumbnailUrl: uploadData.thumbnailUrl || "",
                  duration: uploadData.duration || 0,
                })
              }
            } catch (contentError: any) {
              console.warn(`⚠️ [Purchase Verification] Error fetching content ${contentId}:`, contentError.message)
            }
          }
        }

        const bundlePurchaseData = {
          ...purchaseData,
          bundleId: itemId,
          bundleTitle: itemData.title || "Untitled Bundle",
          bundleDescription: itemData.description || "",
          contents: bundleContents,
          items: bundleContents,
          itemNames: bundleContents.map((item) => item.displayTitle || item.title || "Untitled"),
          contentTitles: bundleContents.map((item) => item.displayTitle || item.title || "Untitled"),
          totalItems: bundleContents.length,
          totalSize: bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0),
          contentCount: bundleContents.length,
        }

        await db.collection("bundlePurchases").doc(sessionId).set(bundlePurchaseData)
        console.log(`✅ [Purchase Verification] Saved to bundlePurchases with ${bundleContents.length} items`)
      } catch (bundleError: any) {
        console.error("❌ [Purchase Verification] Failed to save to bundlePurchases:", bundleError.message)
        // Don't fail the entire request, but log the error
      }
    }

    // Save to user's personal purchases if authenticated
    if (finalUserId && finalUserId !== "anonymous" && !finalUserId.startsWith("anonymous_")) {
      try {
        await db.collection("users").doc(finalUserId).collection("purchases").add(purchaseData)

        // Update user profile
        await db
          .collection("users")
          .doc(finalUserId)
          .update({
            lastPurchaseAt: new Date(),
            totalPurchases: db.FieldValue.increment(1),
            totalSpent: db.FieldValue.increment(purchaseData.amount),
          })
        console.log(`✅ [Purchase Verification] Updated user profile`)
      } catch (userError: any) {
        console.warn("⚠️ [Purchase Verification] Failed to update user data:", userError.message)
      }
    }

    // Update item sales counter
    try {
      await db
        .collection(collection)
        .doc(itemId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(purchaseData.amount),
          lastPurchaseAt: new Date(),
        })
      console.log(`✅ [Purchase Verification] Updated item sales counter`)
    } catch (salesError: any) {
      console.warn("⚠️ [Purchase Verification] Failed to update sales counter:", salesError.message)
    }

    // Record sale for creator
    if (actualCreatorId) {
      try {
        await db
          .collection("users")
          .doc(actualCreatorId)
          .collection("sales")
          .add({
            ...purchaseData,
            platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
            netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
          })

        await db
          .collection("users")
          .doc(actualCreatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(purchaseData.amount),
            lastSaleAt: new Date(),
          })
        console.log(`✅ [Purchase Verification] Updated creator sales data`)
      } catch (creatorSalesError: any) {
        console.warn("⚠️ [Purchase Verification] Failed to update creator sales:", creatorSalesError.message)
      }
    }

    console.log(`✅ [Purchase Verification] Purchase verification completed successfully`)

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      message: "Purchase verified and access granted",
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verification] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
