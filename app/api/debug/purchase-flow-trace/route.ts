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
    console.log(`[${status.toUpperCase()}] ${step}:`, data)
  }

  try {
    const { sessionId, userId } = await request.json()

    addStep("Request Received", "info", { sessionId, userId })

    if (!sessionId) {
      addStep("Validation", "error", {}, "Session ID is required")
      return NextResponse.json({ success: false, steps, error: "Session ID required" }, { status: 400 })
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    // Step 1: Retrieve Stripe Session
    addStep("Stripe Session Retrieval", "info", { attempting: true })

    let session: any = null
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent", "customer"],
      })

      addStep("Stripe Session Retrieval", "success", {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        metadata: session.metadata,
        created: new Date(session.created * 1000).toISOString(),
      })
    } catch (error: any) {
      addStep("Stripe Session Retrieval", "error", {}, error.message)
      return NextResponse.json({ success: false, steps, error: "Failed to retrieve Stripe session" }, { status: 500 })
    }

    // Step 2: Analyze Metadata
    addStep("Metadata Analysis", "info", { analyzing: true })

    const metadata = session.metadata || {}
    const { buyerUid, buyerEmail, buyerName, bundleId, productBoxId, creatorId, contentType, isAuthenticated } =
      metadata

    const itemId = bundleId || productBoxId
    const isBundle = contentType === "bundle" || !!bundleId

    addStep("Metadata Analysis", metadata ? "success" : "warning", {
      buyerUid,
      buyerEmail,
      buyerName,
      bundleId,
      productBoxId,
      itemId,
      creatorId,
      contentType,
      isAuthenticated,
      isBundle,
      metadataKeys: Object.keys(metadata),
      hasRequiredFields: !!(buyerUid && itemId),
    })

    if (!buyerUid) {
      addStep("Metadata Validation", "error", {}, "No buyerUid found in session metadata")
    }

    if (!itemId) {
      addStep("Metadata Validation", "error", {}, "No bundle/product ID found in session metadata")
    }

    // Step 3: User Verification
    addStep("User Verification", "info", { verifying: buyerUid })

    let userDetails = null
    if (buyerUid && buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
      try {
        const userRecord = await auth.getUser(buyerUid)
        userDetails = {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        }

        addStep("User Verification", "success", userDetails)
      } catch (error: any) {
        addStep("User Verification", "error", { buyerUid }, error.message)
      }
    } else {
      addStep("User Verification", "warning", { buyerUid }, "Anonymous or invalid user ID")
    }

    // Step 4: Item Verification
    addStep("Item Verification", "info", { itemId, isBundle })

    let itemData = null
    if (itemId) {
      try {
        const collection = isBundle ? "bundles" : "productBoxes"
        const itemDoc = await db.collection(collection).doc(itemId).get()

        if (itemDoc.exists) {
          itemData = itemDoc.data()
          addStep("Item Verification", "success", {
            collection,
            id: itemId,
            title: itemData?.title,
            description: itemData?.description,
            price: itemData?.price,
            creatorId: itemData?.creatorId,
            active: itemData?.active,
            contentItems: itemData?.contentItems?.length || 0,
            detailedContentItems: itemData?.detailedContentItems?.length || 0,
          })
        } else {
          addStep("Item Verification", "error", { collection, itemId }, "Item not found")
        }
      } catch (error: any) {
        addStep("Item Verification", "error", { itemId }, error.message)
      }
    }

    // Step 5: Check Existing Purchases
    addStep("Existing Purchase Check", "info", { checking: true })

    const existingPurchases = {
      mainPurchases: [],
      bundlePurchases: [],
      userPurchases: [],
      userSubcollection: [],
    }

    // Check main purchases collection
    try {
      const mainQuery = await db.collection("purchases").where("sessionId", "==", sessionId).get()
      mainQuery.forEach((doc) => {
        existingPurchases.mainPurchases.push({
          id: doc.id,
          ...doc.data(),
        })
      })
    } catch (error: any) {
      addStep("Main Purchases Check", "error", {}, error.message)
    }

    // Check bundlePurchases collection
    try {
      const bundleQuery = await db.collection("bundlePurchases").where("sessionId", "==", sessionId).get()
      bundleQuery.forEach((doc) => {
        existingPurchases.bundlePurchases.push({
          id: doc.id,
          ...doc.data(),
        })
      })
    } catch (error: any) {
      addStep("Bundle Purchases Check", "error", {}, error.message)
    }

    // Check userPurchases collection
    if (buyerUid && buyerUid !== "anonymous") {
      try {
        const userPurchaseDoc = await db
          .collection("userPurchases")
          .doc(buyerUid)
          .collection("purchases")
          .doc(sessionId)
          .get()
        if (userPurchaseDoc.exists) {
          existingPurchases.userPurchases.push({
            id: userPurchaseDoc.id,
            ...userPurchaseDoc.data(),
          })
        }
      } catch (error: any) {
        addStep("User Purchases Check", "error", {}, error.message)
      }

      // Check user subcollection
      try {
        const userSubQuery = await db
          .collection("users")
          .doc(buyerUid)
          .collection("purchases")
          .where("sessionId", "==", sessionId)
          .get()
        userSubQuery.forEach((doc) => {
          existingPurchases.userSubcollection.push({
            id: doc.id,
            ...doc.data(),
          })
        })
      } catch (error: any) {
        addStep("User Subcollection Check", "error", {}, error.message)
      }
    }

    const totalExisting = Object.values(existingPurchases).reduce((sum, arr) => sum + arr.length, 0)

    addStep("Existing Purchase Check", totalExisting > 0 ? "warning" : "success", {
      totalFound: totalExisting,
      breakdown: {
        mainPurchases: existingPurchases.mainPurchases.length,
        bundlePurchases: existingPurchases.bundlePurchases.length,
        userPurchases: existingPurchases.userPurchases.length,
        userSubcollection: existingPurchases.userSubcollection.length,
      },
      details: existingPurchases,
    })

    // Step 6: User Access Check
    addStep("User Access Check", "info", { checking: buyerUid })

    let userAccess = null
    if (buyerUid && buyerUid !== "anonymous" && itemId) {
      try {
        const userDoc = await db.collection("users").doc(buyerUid).get()
        if (userDoc.exists) {
          const userData = userDoc.data()
          const accessField = isBundle ? "bundleAccess" : "productBoxAccess"
          userAccess = {
            userExists: true,
            hasAccessField: !!userData?.[accessField],
            hasItemAccess: !!userData?.[accessField]?.[itemId],
            accessDetails: userData?.[accessField]?.[itemId] || null,
            totalPurchases: userData?.totalPurchases || 0,
            lastPurchaseAt: userData?.lastPurchaseAt || null,
          }
        } else {
          userAccess = { userExists: false }
        }

        addStep("User Access Check", "success", userAccess)
      } catch (error: any) {
        addStep("User Access Check", "error", { buyerUid }, error.message)
      }
    }

    // Step 7: Creator Verification
    addStep("Creator Verification", "info", { creatorId })

    let creatorData = null
    if (creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creator = creatorDoc.data()
          creatorData = {
            id: creatorId,
            username: creator?.username,
            displayName: creator?.displayName,
            email: creator?.email,
            stripeAccountId: creator?.stripeAccountId,
            totalSales: creator?.totalSales || 0,
            totalRevenue: creator?.totalRevenue || 0,
          }
          addStep("Creator Verification", "success", creatorData)
        } else {
          addStep("Creator Verification", "error", { creatorId }, "Creator not found")
        }
      } catch (error: any) {
        addStep("Creator Verification", "error", { creatorId }, error.message)
      }
    }

    // Step 8: Payment Status Analysis
    addStep("Payment Analysis", "info", { analyzing: true })

    const paymentAnalysis = {
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      amountReceived: session.amount_total,
      currency: session.currency,
      paymentIntentId: session.payment_intent,
      customerEmail: session.customer_details?.email,
      isPaymentComplete: session.payment_status === "paid",
      isSessionComplete: session.status === "complete",
    }

    addStep("Payment Analysis", paymentAnalysis.isPaymentComplete ? "success" : "warning", paymentAnalysis)

    // Step 9: Content Analysis (for bundles)
    let contentAnalysis = null
    if (isBundle && itemData) {
      addStep("Content Analysis", "info", { analyzing: true })

      try {
        const contentItems = []
        const contentSources = [
          { items: itemData.contentItems || [], source: "contentItems" },
          { items: itemData.detailedContentItems || [], source: "detailedContentItems" },
          { items: itemData.contents || [], source: "contents" },
        ]

        for (const { items, source } of contentSources) {
          for (const item of items) {
            const itemId = typeof item === "string" ? item : item.id

            if (typeof item === "object" && item.fileUrl) {
              contentItems.push({ ...item, source })
            } else {
              try {
                const uploadDoc = await db.collection("uploads").doc(itemId).get()
                if (uploadDoc.exists) {
                  contentItems.push({ id: itemId, ...uploadDoc.data(), source })
                }
              } catch (error) {
                console.warn(`Could not fetch upload ${itemId}:`, error)
              }
            }
          }
        }

        contentAnalysis = {
          totalItems: contentItems.length,
          validItems: contentItems.filter((item) => item.fileUrl).length,
          invalidItems: contentItems.filter((item) => !item.fileUrl).length,
          totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
          contentTypes: contentItems.reduce((types, item) => {
            const type = item.mimeType?.split("/")[0] || "unknown"
            types[type] = (types[type] || 0) + 1
            return types
          }, {}),
          items: contentItems.map((item) => ({
            id: item.id,
            title: item.title || item.filename,
            fileUrl: item.fileUrl,
            fileSize: item.fileSize,
            mimeType: item.mimeType,
            source: item.source,
          })),
        }

        addStep("Content Analysis", "success", contentAnalysis)
      } catch (error: any) {
        addStep("Content Analysis", "error", {}, error.message)
      }
    }

    // Step 10: Generate Recommendations
    const recommendations = []
    const criticalIssues = []

    if (!buyerUid) {
      criticalIssues.push("No buyerUid in session metadata - purchases cannot be attributed to users")
      recommendations.push("Ensure buyerUid is set in Stripe checkout session metadata")
    }

    if (!itemId) {
      criticalIssues.push("No bundle/product ID in session metadata")
      recommendations.push("Ensure bundleId or productBoxId is set in checkout session metadata")
    }

    if (session.payment_status !== "paid") {
      criticalIssues.push("Payment not completed")
      recommendations.push("Only process purchases for sessions with payment_status = 'paid'")
    }

    if (totalExisting === 0 && session.payment_status === "paid") {
      criticalIssues.push("Payment completed but no purchase records found")
      recommendations.push("Purchase verification endpoint may not be working correctly")
    }

    if (isBundle && existingPurchases.bundlePurchases.length === 0 && session.payment_status === "paid") {
      criticalIssues.push("Bundle purchase not saved to bundlePurchases collection")
      recommendations.push("Ensure bundle purchases are saved to bundlePurchases collection")
    }

    if (buyerUid !== "anonymous" && !userAccess?.hasItemAccess && session.payment_status === "paid") {
      criticalIssues.push("User does not have access granted despite completed payment")
      recommendations.push("Ensure user access is granted in user document after purchase")
    }

    addStep("Analysis Complete", "success", {
      totalSteps: steps.length,
      criticalIssues: criticalIssues.length,
      recommendations: recommendations.length,
    })

    return NextResponse.json({
      success: true,
      sessionId,
      userId,
      steps,
      summary: {
        session: {
          id: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          amount: session.amount_total,
          currency: session.currency,
        },
        metadata: {
          buyerUid,
          itemId,
          isBundle,
          contentType,
          hasRequiredFields: !!(buyerUid && itemId),
        },
        purchases: {
          total: totalExisting,
          inBundlePurchases: existingPurchases.bundlePurchases.length,
          inMainPurchases: existingPurchases.mainPurchases.length,
          inUserPurchases: existingPurchases.userPurchases.length,
        },
        userAccess: userAccess,
        contentAnalysis: contentAnalysis,
        criticalIssues,
        recommendations,
      },
    })
  } catch (error: any) {
    addStep("Critical Error", "error", {}, error.message)

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
