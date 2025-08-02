import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-server"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    console.log(`🔍 [Purchase Verification] Verifying session: ${sessionId} for user: ${userId}`)

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log(`📋 [Purchase Verification] Session status: ${session.payment_status}`)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract metadata
    const { productBoxId, bundleId, buyerUid, creatorId, contentType } = session.metadata || {}
    const itemId = bundleId || productBoxId
    const isBundle = contentType === "bundle" || !!bundleId

    console.log(`📦 [Purchase Verification] Item details:`, {
      itemId,
      isBundle,
      contentType,
      buyerUid,
      creatorId,
    })

    if (!itemId) {
      return NextResponse.json({ error: "No product/bundle ID in session metadata" }, { status: 400 })
    }

    const db = getAdminDb()

    // Check if purchase already exists
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

    // Get user details
    let userEmail = ""
    let userName = "User"
    let isAuthenticated = false

    if (userId && userId !== "anonymous") {
      try {
        const userRecord = await getAdminAuth().getUser(userId)
        userEmail = userRecord.email || session.customer_email || ""
        userName = userRecord.displayName || userRecord.email?.split("@")[0] || "User"
        isAuthenticated = true
        console.log(`✅ [Purchase Verification] User verified: ${userName} (${userEmail})`)
      } catch (error) {
        console.warn(`⚠️ [Purchase Verification] Could not verify user: ${userId}`)
        userEmail = session.customer_email || ""
        userName = userEmail?.split("@")[0] || "Anonymous User"
      }
    } else {
      userEmail = session.customer_email || ""
      userName = userEmail?.split("@")[0] || "Anonymous User"
    }

    // Get item details
    const collection = isBundle ? "bundles" : "productBoxes"
    const itemDoc = await db.collection(collection).doc(itemId).get()

    if (!itemDoc.exists) {
      return NextResponse.json({ error: `${collection} not found: ${itemId}` }, { status: 404 })
    }

    const itemData = itemDoc.data()!
    console.log(`📦 [Purchase Verification] Item found: ${itemData.title}`)

    // Get creator details
    const actualCreatorId = creatorId || itemData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record
    await UnifiedPurchaseService.createUnifiedPurchase(userId || buyerUid || "anonymous", {
      [isBundle ? "bundleId" : "productBoxId"]: itemId,
      sessionId: sessionId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: actualCreatorId || "",
      userEmail: userEmail,
      userName: userName,
    })

    // Create comprehensive purchase data
    const purchaseData = {
      // User identification
      userId: userId || buyerUid || "anonymous",
      buyerUid: userId || buyerUid || "anonymous",
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

    // Save to main purchases collection
    await db.collection("purchases").doc(sessionId).set(purchaseData)

    // CRITICAL: Save to bundlePurchases collection if it's a bundle
    if (isBundle) {
      console.log(`🎁 [Purchase Verification] Saving to bundlePurchases collection`)

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
          } catch (error) {
            console.warn(`⚠️ [Purchase Verification] Error fetching content ${contentId}:`, error)
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
    }

    // Save to user's personal purchases if authenticated
    if (userId && userId !== "anonymous" && !userId.startsWith("anonymous_")) {
      await db.collection("users").doc(userId).collection("purchases").add(purchaseData)

      // Update user profile
      await db
        .collection("users")
        .doc(userId)
        .update({
          lastPurchaseAt: new Date(),
          totalPurchases: db.FieldValue.increment(1),
          totalSpent: db.FieldValue.increment(purchaseData.amount),
        })
    }

    // Update item sales counter
    await db
      .collection(collection)
      .doc(itemId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(purchaseData.amount),
        lastPurchaseAt: new Date(),
      })

    // Record sale for creator
    if (actualCreatorId) {
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
    }

    console.log(`✅ [Purchase Verification] Purchase verification completed successfully`)

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      message: "Purchase verified and access granted",
    })
  } catch (error) {
    console.error("❌ [Purchase Verification] Error:", error)
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 })
  }
}
