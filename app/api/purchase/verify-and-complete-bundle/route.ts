import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, forceComplete } = await request.json()

    console.log("🔍 [Bundle Verification] Starting verification:", {
      sessionId,
      productBoxId,
      forceComplete,
    })

    // Get authenticated user if available
    let authenticatedUser = null
    try {
      authenticatedUser = await verifyIdToken(request)
      console.log("✅ [Bundle Verification] Authenticated user:", authenticatedUser?.uid)
    } catch (error) {
      console.log("ℹ️ [Bundle Verification] No authenticated user")
    }

    // If we have a session ID, retrieve it from Stripe
    let stripeSession = null
    if (sessionId) {
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
        console.log("✅ [Bundle Verification] Retrieved Stripe session:", {
          id: stripeSession.id,
          payment_status: stripeSession.payment_status,
          metadata: stripeSession.metadata,
        })

        // Validate payment was successful
        if (stripeSession.payment_status !== "paid") {
          return NextResponse.json(
            { error: `Payment not completed. Status: ${stripeSession.payment_status}` },
            { status: 400 },
          )
        }
      } catch (stripeError) {
        console.error("❌ [Bundle Verification] Failed to retrieve Stripe session:", stripeError)
        if (!forceComplete) {
          return NextResponse.json({ error: "Invalid session ID" }, { status: 404 })
        }
      }
    }

    // Extract purchase details
    const bundleId = productBoxId || stripeSession?.metadata?.productBoxId || stripeSession?.metadata?.bundleId
    const buyerUid = authenticatedUser?.uid || stripeSession?.metadata?.buyerUid || stripeSession?.client_reference_id
    const userEmail =
      authenticatedUser?.email || stripeSession?.customer_details?.email || stripeSession?.metadata?.userEmail
    const amount = stripeSession?.amount_total ? stripeSession.amount_total / 100 : 0
    const currency = stripeSession?.currency || "usd"

    console.log("📊 [Bundle Verification] Extracted details:", {
      bundleId,
      buyerUid,
      userEmail,
      amount,
      currency,
    })

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID not found" }, { status: 400 })
    }

    if (!buyerUid) {
      return NextResponse.json({ error: "User identification not found" }, { status: 400 })
    }

    // Check if purchase already exists
    const existingPurchaseQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", buyerUid)
      .where("bundleId", "==", bundleId)
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty && !forceComplete) {
      const existingPurchase = existingPurchaseQuery.docs[0]
      const purchaseData = existingPurchase.data()

      console.log("✅ [Bundle Verification] Purchase already exists:", existingPurchase.id)

      return NextResponse.json({
        success: true,
        purchase: {
          id: existingPurchase.id,
          bundleId: purchaseData.bundleId,
          bundleTitle: purchaseData.bundleTitle,
          description: purchaseData.description,
          thumbnailUrl: purchaseData.thumbnailUrl,
          creatorName: purchaseData.creatorName,
          creatorUsername: purchaseData.creatorUsername,
          amount: purchaseData.amount,
          currency: purchaseData.currency,
          contentCount: purchaseData.contentCount,
          totalSize: purchaseData.totalSize,
          buyerUid: purchaseData.buyerUid,
          itemNames: purchaseData.itemNames || [],
          contents: purchaseData.contents || [],
        },
      })
    }

    // Get bundle data
    let bundleData = null
    let bundleSource = ""

    // Try bundles collection first
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (bundleDoc.exists()) {
      bundleData = bundleDoc.data()!
      bundleSource = "bundles"
    } else {
      // Try productBoxes collection
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (productBoxDoc.exists()) {
        bundleData = productBoxDoc.data()!
        bundleSource = "productBoxes"
      }
    }

    if (!bundleData) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    console.log("📦 [Bundle Verification] Found bundle:", {
      title: bundleData.title,
      source: bundleSource,
    })

    // Get creator data
    let creatorData = null
    const creatorId = bundleData.creatorId
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (creatorDoc.exists()) {
        creatorData = creatorDoc.data()!
      }
    }

    // Get bundle content
    let contentItems = []
    let contentCount = 0
    let totalSize = 0
    let itemNames = []
    let contents = []

    try {
      // Try to get content from multiple sources
      if (bundleData.detailedContentItems && bundleData.detailedContentItems.length > 0) {
        contentItems = bundleData.detailedContentItems
        console.log("📄 [Bundle Verification] Using detailedContentItems:", contentItems.length)
      } else if (bundleData.contents && bundleData.contents.length > 0) {
        contentItems = bundleData.contents
        console.log("📄 [Bundle Verification] Using contents array:", contentItems.length)
      } else if (bundleData.contentItems && bundleData.contentItems.length > 0) {
        // Fetch detailed content from uploads collection
        console.log("📄 [Bundle Verification] Fetching content from uploads collection")
        const contentPromises = bundleData.contentItems.map(async (itemId: string) => {
          try {
            const uploadDoc = await db.collection("uploads").doc(itemId).get()
            if (uploadDoc.exists()) {
              const uploadData = uploadDoc.data()!
              return {
                id: itemId,
                title: uploadData.title || uploadData.name || "Untitled",
                fileUrl: uploadData.fileUrl || uploadData.url || "",
                thumbnailUrl: uploadData.thumbnailUrl || "",
                fileSize: uploadData.fileSize || 0,
                duration: uploadData.duration || 0,
                type: uploadData.type || "video",
              }
            }
            return null
          } catch (error) {
            console.warn(`⚠️ [Bundle Verification] Failed to fetch content ${itemId}:`, error)
            return null
          }
        })

        const resolvedContent = await Promise.all(contentPromises)
        contentItems = resolvedContent.filter((item) => item !== null)
        console.log("📄 [Bundle Verification] Fetched content items:", contentItems.length)
      }

      // Process content items
      contentCount = contentItems.length
      totalSize = contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
      itemNames = contentItems.map((item) => item.title || item.name || "Untitled")
      contents = contentItems.map((item) => ({
        id: item.id,
        title: item.title || item.name || "Untitled",
        fileUrl: item.fileUrl || item.url || "",
        thumbnailUrl: item.thumbnailUrl || "",
        fileSize: item.fileSize || 0,
        duration: item.duration || 0,
        type: item.type || "video",
      }))

      console.log("📊 [Bundle Verification] Content summary:", {
        contentCount,
        totalSize,
        itemNamesCount: itemNames.length,
      })
    } catch (error) {
      console.error("❌ [Bundle Verification] Error processing content:", error)
    }

    // Create comprehensive purchase record
    const purchaseData = {
      id: sessionId || `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId || null,
      bundleId,
      buyerUid,
      userEmail: userEmail || "",
      amount,
      currency,
      bundleTitle: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || "",
      creatorId: creatorId || "",
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      contentCount,
      totalSize,
      itemNames,
      contents,
      items: contents, // Duplicate for compatibility
      createdAt: new Date(),
      completedAt: new Date(),
      status: "completed",
      isAuthenticated: !!authenticatedUser,
      bundleSource,
    }

    // Save to bundlePurchases collection
    const purchaseRef = db.collection("bundlePurchases").doc(purchaseData.id)
    await purchaseRef.set(purchaseData)

    console.log("✅ [Bundle Verification] Purchase record created:", purchaseData.id)

    // Also save to user's purchases subcollection for easy access
    if (buyerUid !== "anonymous") {
      await db.collection("users").doc(buyerUid).collection("purchases").doc(purchaseData.id).set(purchaseData)

      console.log("✅ [Bundle Verification] Added to user's purchases subcollection")
    }

    // Update bundle sales stats
    try {
      await db
        .collection(bundleSource)
        .doc(bundleId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(amount),
          lastPurchaseAt: new Date(),
        })

      console.log("✅ [Bundle Verification] Updated bundle sales stats")
    } catch (error) {
      console.warn("⚠️ [Bundle Verification] Failed to update bundle stats:", error)
    }

    // Update creator stats
    if (creatorId) {
      try {
        await db
          .collection("users")
          .doc(creatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(amount * 0.75), // 75% to creator
            lastSaleAt: new Date(),
          })

        console.log("✅ [Bundle Verification] Updated creator stats")
      } catch (error) {
        console.warn("⚠️ [Bundle Verification] Failed to update creator stats:", error)
      }
    }

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchaseData.id,
        bundleId: purchaseData.bundleId,
        bundleTitle: purchaseData.bundleTitle,
        description: purchaseData.description,
        thumbnailUrl: purchaseData.thumbnailUrl,
        creatorName: purchaseData.creatorName,
        creatorUsername: purchaseData.creatorUsername,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        contentCount: purchaseData.contentCount,
        totalSize: purchaseData.totalSize,
        buyerUid: purchaseData.buyerUid,
        itemNames: purchaseData.itemNames,
        contents: purchaseData.contents,
      },
    })
  } catch (error) {
    console.error("❌ [Bundle Verification] Error:", error)
    return NextResponse.json({ error: "Bundle verification failed" }, { status: 500 })
  }
}
