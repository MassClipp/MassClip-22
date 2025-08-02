import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface DebugStep {
  step: string
  status: "success" | "error" | "warning" | "info"
  data: any
  timestamp: string
  error?: string
}

export async function POST(request: NextRequest) {
  const steps: DebugStep[] = []

  const addStep = (step: string, status: "success" | "error" | "warning" | "info", data: any, error?: string) => {
    steps.push({
      step,
      status,
      data,
      timestamp: new Date().toISOString(),
      error,
    })
    console.log(`🔍 [Debug] ${step}: ${status}`, data)
  }

  try {
    const { sessionId, userId } = await request.json()

    addStep("Debug Started", "info", { sessionId, userId })

    if (!sessionId) {
      addStep("Validation Failed", "error", { error: "Session ID is required" })
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
          steps,
        },
        { status: 400 },
      )
    }

    // Step 1: Retrieve Stripe Session
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })
      addStep("Stripe Session Retrieved", "success", {
        id: session.id,
        paymentStatus: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
        metadata: session.metadata,
      })
    } catch (error: any) {
      addStep("Stripe Session Retrieval Failed", "error", { error: error.message }, error.message)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to retrieve Stripe session: ${error.message}`,
          steps,
        },
        { status: 400 },
      )
    }

    // Step 2: Analyze Metadata
    const metadata = session.metadata || {}
    const buyerUid = metadata.buyerUid || metadata.userId
    const productBoxId = metadata.productBoxId
    const bundleId = metadata.bundleId
    const creatorId = metadata.creatorId
    const contentType = metadata.contentType
    const itemId = bundleId || productBoxId
    const isBundle = contentType === "bundle" || !!bundleId

    addStep(
      "Metadata Analysis",
      buyerUid && itemId ? "success" : "warning",
      {
        buyerUid,
        productBoxId,
        bundleId,
        creatorId,
        contentType,
        itemId,
        isBundle,
        allMetadata: metadata,
      },
      !buyerUid ? "Missing buyerUid in metadata" : !itemId ? "Missing item ID in metadata" : undefined,
    )

    // Step 3: User Verification
    const db = getAdminDb()
    let userExists = false
    let userDetails = null

    if (buyerUid && buyerUid !== "anonymous") {
      try {
        const userRecord = await getAdminAuth().getUser(buyerUid)
        userExists = true
        userDetails = {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
        }
        addStep("User Verification", "success", userDetails)
      } catch (error: any) {
        addStep("User Verification Failed", "warning", { buyerUid, error: error.message }, error.message)
      }
    } else {
      addStep("User Verification Skipped", "info", { reason: "Anonymous or missing buyerUid" })
    }

    // Step 4: Item Verification
    let itemExists = false
    let itemDetails = null

    if (itemId) {
      try {
        const collection = isBundle ? "bundles" : "productBoxes"
        const itemDoc = await db.collection(collection).doc(itemId).get()

        if (itemDoc.exists) {
          itemExists = true
          itemDetails = {
            id: itemDoc.id,
            title: itemDoc.data()?.title,
            creatorId: itemDoc.data()?.creatorId,
            price: itemDoc.data()?.price,
            contentItems: itemDoc.data()?.contentItems?.length || 0,
          }
          addStep(`${isBundle ? "Bundle" : "Product Box"} Verification`, "success", itemDetails)
        } else {
          addStep(`${isBundle ? "Bundle" : "Product Box"} Not Found`, "error", { itemId, collection })
        }
      } catch (error: any) {
        addStep(
          `${isBundle ? "Bundle" : "Product Box"} Verification Failed`,
          "error",
          { error: error.message },
          error.message,
        )
      }
    } else {
      addStep("Item Verification Skipped", "warning", { reason: "No item ID found" })
    }

    // Step 5: Check Existing Purchases
    const purchaseChecks = {
      mainPurchases: 0,
      bundlePurchases: 0,
      productBoxPurchases: 0,
      userPurchases: 0,
      total: 0,
    }

    // Check main purchases collection
    try {
      const mainPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()
      purchaseChecks.mainPurchases = mainPurchaseQuery.size
      addStep("Main Purchases Check", mainPurchaseQuery.size > 0 ? "success" : "info", {
        found: mainPurchaseQuery.size,
        data: mainPurchaseQuery.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      })
    } catch (error: any) {
      addStep("Main Purchases Check Failed", "error", { error: error.message }, error.message)
    }

    // Check bundle purchases collection
    if (isBundle) {
      try {
        const bundlePurchaseQuery = await db
          .collection("bundlePurchases")
          .where("sessionId", "==", sessionId)
          .limit(1)
          .get()
        purchaseChecks.bundlePurchases = bundlePurchaseQuery.size
        addStep("Bundle Purchases Check", bundlePurchaseQuery.size > 0 ? "success" : "warning", {
          found: bundlePurchaseQuery.size,
          data: bundlePurchaseQuery.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        })
      } catch (error: any) {
        addStep("Bundle Purchases Check Failed", "error", { error: error.message }, error.message)
      }
    }

    // Check user purchases collection
    if (buyerUid && buyerUid !== "anonymous") {
      try {
        const userPurchaseDoc = await db
          .collection("userPurchases")
          .doc(buyerUid)
          .collection("purchases")
          .doc(sessionId)
          .get()
        purchaseChecks.userPurchases = userPurchaseDoc.exists ? 1 : 0
        addStep("User Purchases Check", userPurchaseDoc.exists ? "success" : "warning", {
          found: userPurchaseDoc.exists ? 1 : 0,
          data: userPurchaseDoc.exists ? userPurchaseDoc.data() : null,
        })
      } catch (error: any) {
        addStep("User Purchases Check Failed", "error", { error: error.message }, error.message)
      }
    }

    purchaseChecks.total = purchaseChecks.mainPurchases + purchaseChecks.bundlePurchases + purchaseChecks.userPurchases

    // Step 6: Check User Access
    let hasItemAccess = false
    let userAccessDetails = null

    if (buyerUid && buyerUid !== "anonymous" && itemId) {
      try {
        const userDoc = await db.collection("users").doc(buyerUid).get()
        if (userDoc.exists) {
          const userData = userDoc.data()!
          const purchasedItems = userData.purchasedItems || []
          const purchasedBundles = userData.purchasedBundles || []
          const purchasedProductBoxes = userData.purchasedProductBoxes || []

          hasItemAccess =
            purchasedItems.includes(itemId) ||
            (isBundle && purchasedBundles.includes(itemId)) ||
            (!isBundle && purchasedProductBoxes.includes(itemId))

          userAccessDetails = {
            purchasedItems: purchasedItems.length,
            purchasedBundles: purchasedBundles.length,
            purchasedProductBoxes: purchasedProductBoxes.length,
            hasItemAccess,
            itemInPurchasedItems: purchasedItems.includes(itemId),
            itemInSpecificCollection: isBundle
              ? purchasedBundles.includes(itemId)
              : purchasedProductBoxes.includes(itemId),
          }

          addStep("User Access Check", hasItemAccess ? "success" : "warning", userAccessDetails)
        } else {
          addStep("User Document Not Found", "warning", { buyerUid })
        }
      } catch (error: any) {
        addStep("User Access Check Failed", "error", { error: error.message }, error.message)
      }
    }

    // Step 7: Content Analysis (for bundles)
    let contentAnalysis = null
    if (isBundle && itemExists) {
      try {
        const bundleDoc = await db.collection("bundles").doc(itemId).get()
        if (bundleDoc.exists) {
          const bundleData = bundleDoc.data()!
          const contentItems = bundleData.contentItems || []

          // Check if content items exist
          const contentChecks = []
          for (const contentId of contentItems.slice(0, 5)) {
            // Check first 5
            try {
              const uploadDoc = await db.collection("uploads").doc(contentId).get()
              contentChecks.push({
                id: contentId,
                exists: uploadDoc.exists,
                title: uploadDoc.exists ? uploadDoc.data()?.title : null,
                fileUrl: uploadDoc.exists ? !!uploadDoc.data()?.fileUrl : false,
              })
            } catch (error) {
              contentChecks.push({
                id: contentId,
                exists: false,
                error: error.message,
              })
            }
          }

          contentAnalysis = {
            totalContentItems: contentItems.length,
            checkedItems: contentChecks.length,
            existingItems: contentChecks.filter((c) => c.exists).length,
            itemsWithUrls: contentChecks.filter((c) => c.fileUrl).length,
            contentChecks,
          }

          addStep("Content Analysis", "success", contentAnalysis)
        }
      } catch (error: any) {
        addStep("Content Analysis Failed", "error", { error: error.message }, error.message)
      }
    }

    // Generate Critical Issues and Recommendations
    const criticalIssues: string[] = []
    const recommendations: string[] = []

    if (session.payment_status !== "paid") {
      criticalIssues.push("Payment not completed - session status is " + session.payment_status)
    }

    if (!buyerUid) {
      criticalIssues.push("Missing buyerUid in Stripe session metadata")
      recommendations.push("Ensure buyerUid is set in checkout session metadata")
    }

    if (!itemId) {
      criticalIssues.push("Missing item ID (bundleId or productBoxId) in metadata")
      recommendations.push("Ensure bundleId or productBoxId is set in checkout session metadata")
    }

    if (!itemExists && itemId) {
      criticalIssues.push(`${isBundle ? "Bundle" : "Product Box"} ${itemId} not found in database`)
      recommendations.push(`Verify the ${isBundle ? "bundle" : "product box"} exists in Firestore`)
    }

    if (purchaseChecks.total === 0) {
      criticalIssues.push("No purchase records found in any collection")
      recommendations.push("Run purchase verification to create purchase records")
    }

    if (isBundle && purchaseChecks.bundlePurchases === 0) {
      criticalIssues.push("Bundle purchase not found in bundlePurchases collection")
      recommendations.push("Ensure bundle purchases are saved to bundlePurchases collection")
    }

    if (!hasItemAccess && buyerUid && buyerUid !== "anonymous") {
      criticalIssues.push("User does not have access to purchased item")
      recommendations.push("Grant user access by updating their purchasedItems array")
    }

    if (userExists && !hasItemAccess) {
      recommendations.push("Update user document with purchased item access")
    }

    // Final Summary
    const summary = {
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
      },
      metadata: {
        buyerUid,
        itemId,
        isBundle,
        creatorId,
        contentType,
        complete: !!(buyerUid && itemId),
      },
      purchases: purchaseChecks,
      userAccess: {
        userExists,
        hasItemAccess,
        userDetails,
      },
      contentAnalysis,
      criticalIssues,
      recommendations,
    }

    addStep("Debug Complete", criticalIssues.length === 0 ? "success" : "warning", summary)

    return NextResponse.json({
      success: true,
      sessionId,
      userId: buyerUid || userId,
      steps,
      summary,
    })
  } catch (error: any) {
    console.error("❌ [Debug] Fatal error:", error)
    addStep("Fatal Error", "error", { error: error.message }, error.message)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        steps,
      },
      { status: 500 },
    )
  }
}
