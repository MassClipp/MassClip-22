import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface PurchaseFlowLog {
  stage: string
  timestamp: Date
  status: "success" | "error" | "warning" | "info"
  data: any
  error?: string
  duration?: number
}

interface ComprehensiveDebugResult {
  sessionId: string
  userId?: string
  logs: PurchaseFlowLog[]
  summary: {
    totalStages: number
    successfulStages: number
    errorStages: number
    warningStages: number
    totalDuration: number
  }
  stripeData?: any
  firestoreData?: any
  bundleContent?: any
  deliveryData?: any
  recommendations: string[]
  errors: string[]
}

export async function POST(request: NextRequest) {
  const logs: PurchaseFlowLog[] = []
  const startTime = Date.now()

  const addLog = (stage: string, status: "success" | "error" | "warning" | "info", data: any, error?: string) => {
    logs.push({
      stage,
      timestamp: new Date(),
      status,
      data,
      error,
      duration: Date.now() - startTime,
    })
  }

  try {
    const { sessionId, userId, simulationMode = false } = await request.json()

    addLog("Request Received", "info", { sessionId, userId, simulationMode })

    const result: ComprehensiveDebugResult = {
      sessionId,
      userId,
      logs,
      summary: {
        totalStages: 0,
        successfulStages: 0,
        errorStages: 0,
        warningStages: 0,
        totalDuration: 0,
      },
      recommendations: [],
      errors: [],
    }

    // Stage 1: Stripe Session Verification
    addLog("Stripe Verification", "info", { attempting: true })

    let stripeSession = null
    if (!simulationMode) {
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "payment_intent", "customer"],
        })
        addLog("Stripe Verification", "success", {
          id: stripeSession.id,
          status: stripeSession.status,
          payment_status: stripeSession.payment_status,
          amount_total: stripeSession.amount_total,
          currency: stripeSession.currency,
          customer_email: stripeSession.customer_details?.email,
          metadata: stripeSession.metadata,
          line_items: stripeSession.line_items?.data?.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            amount_total: item.amount_total,
          })),
        })
        result.stripeData = stripeSession
      } catch (error: any) {
        addLog("Stripe Verification", "error", {}, error.message)
        result.errors.push(`Stripe verification failed: ${error.message}`)
      }
    } else {
      addLog("Stripe Verification", "info", { skipped: "Simulation mode" })
      // Create mock Stripe data for simulation
      stripeSession = {
        id: sessionId,
        status: "complete",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        customer_details: { email: "test@example.com" },
        metadata: { productBoxId: "test-bundle-id", userId: userId || "test-user" },
      }
      result.stripeData = stripeSession
    }

    // Stage 2: Firestore Purchase Record Lookup
    addLog("Firestore Lookup", "info", { searching: true })

    let firestorePurchase = null
    try {
      // Check multiple collections for purchase records
      const collections = ["purchases", "bundlePurchases", "productBoxPurchases"]

      for (const collectionName of collections) {
        try {
          const purchaseDoc = await db.collection(collectionName).doc(sessionId).get()
          if (purchaseDoc.exists) {
            firestorePurchase = { ...purchaseDoc.data(), collection: collectionName }
            addLog("Firestore Lookup", "success", {
              found: true,
              collection: collectionName,
              status: firestorePurchase.status,
              userId: firestorePurchase.userId || firestorePurchase.buyerUid,
              productBoxId: firestorePurchase.productBoxId || firestorePurchase.bundleId,
              itemCount: firestorePurchase.items?.length || firestorePurchase.contents?.length || 0,
            })
            break
          }
        } catch (error: any) {
          addLog("Firestore Lookup", "warning", { collection: collectionName, error: error.message })
        }
      }

      if (!firestorePurchase) {
        addLog("Firestore Lookup", "error", { found: false })
        result.errors.push("No purchase record found in Firestore")
      }

      result.firestoreData = firestorePurchase
    } catch (error: any) {
      addLog("Firestore Lookup", "error", {}, error.message)
      result.errors.push(`Firestore lookup failed: ${error.message}`)
    }

    // Stage 3: Bundle Content Analysis
    addLog("Bundle Analysis", "info", { analyzing: true })

    const productBoxId =
      stripeSession?.metadata?.productBoxId || firestorePurchase?.productBoxId || firestorePurchase?.bundleId

    if (productBoxId) {
      try {
        // Get product box/bundle details
        let productBoxData = null
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

        if (productBoxDoc.exists) {
          productBoxData = productBoxDoc.data()
        } else {
          // Try bundles collection
          const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
          if (bundleDoc.exists) {
            productBoxData = bundleDoc.data()
          }
        }

        if (productBoxData) {
          addLog("Bundle Analysis", "success", {
            title: productBoxData.title,
            description: productBoxData.description,
            price: productBoxData.price,
            contentItemsCount: productBoxData.contentItems?.length || 0,
            detailedContentItemsCount: productBoxData.detailedContentItems?.length || 0,
            contentsCount: productBoxData.contents?.length || 0,
            creatorId: productBoxData.creatorId,
            active: productBoxData.active,
            thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail,
          })

          // Analyze content items in detail
          const contentAnalysis = await analyzeContentItems(productBoxId, productBoxData)
          addLog("Content Items Analysis", contentAnalysis.status, contentAnalysis.data)

          result.bundleContent = {
            productBox: productBoxData,
            contentAnalysis: contentAnalysis.data,
          }
        } else {
          addLog("Bundle Analysis", "error", { productBoxId, found: false })
          result.errors.push(`Product box/bundle ${productBoxId} not found`)
        }
      } catch (error: any) {
        addLog("Bundle Analysis", "error", { productBoxId }, error.message)
        result.errors.push(`Bundle analysis failed: ${error.message}`)
      }
    } else {
      addLog("Bundle Analysis", "warning", { reason: "No product box ID found" })
      result.recommendations.push("Ensure product box ID is properly set in Stripe metadata")
    }

    // Stage 4: User Access Verification
    addLog("User Access Check", "info", { checking: true })

    if (userId && productBoxId) {
      try {
        // Check if user has access
        const userPurchaseQuery = await db
          .collection("users")
          .doc(userId)
          .collection("purchases")
          .where("productBoxId", "==", productBoxId)
          .get()

        const hasAccess = !userPurchaseQuery.empty

        addLog("User Access Check", hasAccess ? "success" : "warning", {
          userId,
          productBoxId,
          hasAccess,
          purchaseCount: userPurchaseQuery.size,
        })

        if (!hasAccess) {
          result.recommendations.push("User may not have proper access granted - check user purchase records")
        }
      } catch (error: any) {
        addLog("User Access Check", "error", { userId, productBoxId }, error.message)
        result.errors.push(`User access check failed: ${error.message}`)
      }
    } else {
      addLog("User Access Check", "warning", { reason: "Missing userId or productBoxId" })
    }

    // Stage 5: Content Delivery Simulation
    addLog("Content Delivery Test", "info", { testing: true })

    if (result.bundleContent?.contentAnalysis) {
      try {
        const deliveryTest = await simulateContentDelivery(
          result.bundleContent.contentAnalysis.validItems || [],
          userId || "test-user",
        )

        addLog("Content Delivery Test", deliveryTest.success ? "success" : "warning", deliveryTest.data)
        result.deliveryData = deliveryTest.data

        if (!deliveryTest.success) {
          result.errors.push("Content delivery simulation failed")
        }
      } catch (error: any) {
        addLog("Content Delivery Test", "error", {}, error.message)
        result.errors.push(`Content delivery test failed: ${error.message}`)
      }
    }

    // Stage 6: Generate Recommendations
    generateRecommendations(result, logs)

    // Calculate summary
    result.summary = {
      totalStages: logs.length,
      successfulStages: logs.filter((log) => log.status === "success").length,
      errorStages: logs.filter((log) => log.status === "error").length,
      warningStages: logs.filter((log) => log.status === "warning").length,
      totalDuration: Date.now() - startTime,
    }

    addLog("Debug Complete", "success", result.summary)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: any) {
    addLog("Critical Error", "error", {}, error.message)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        logs,
      },
      { status: 500 },
    )
  }
}

async function analyzeContentItems(productBoxId: string, productBoxData: any) {
  try {
    const analysis = {
      validItems: [],
      invalidItems: [],
      missingItems: [],
      duplicateItems: [],
      totalSize: 0,
      contentTypes: {},
    }

    // Get content items from various sources
    const contentSources = [
      { items: productBoxData.contentItems || [], source: "contentItems" },
      { items: productBoxData.detailedContentItems || [], source: "detailedContentItems" },
      { items: productBoxData.contents || [], source: "contents" },
    ]

    const seenIds = new Set()

    for (const { items, source } of contentSources) {
      for (const item of items) {
        const itemId = typeof item === "string" ? item : item.id

        if (seenIds.has(itemId)) {
          analysis.duplicateItems.push({ id: itemId, source })
          continue
        }
        seenIds.add(itemId)

        try {
          let itemData = null

          if (typeof item === "object" && item.fileUrl) {
            // Already detailed item
            itemData = item
          } else {
            // Fetch from uploads collection
            const uploadDoc = await db.collection("uploads").doc(itemId).get()
            if (uploadDoc.exists) {
              itemData = { id: itemId, ...uploadDoc.data() }
            }
          }

          if (itemData) {
            const isValid = !!(itemData.fileUrl && itemData.title)
            const size = itemData.fileSize || itemData.size || 0
            const contentType = getContentType(itemData.mimeType || itemData.fileType || "")

            if (isValid) {
              analysis.validItems.push({
                id: itemId,
                title: itemData.title || itemData.filename || "Untitled",
                fileUrl: itemData.fileUrl,
                fileSize: size,
                contentType,
                mimeType: itemData.mimeType || itemData.fileType,
                thumbnailUrl: itemData.thumbnailUrl,
                source,
              })
              analysis.totalSize += size
              analysis.contentTypes[contentType] = (analysis.contentTypes[contentType] || 0) + 1
            } else {
              analysis.invalidItems.push({
                id: itemId,
                reason: !itemData.fileUrl ? "Missing file URL" : "Missing title",
                data: itemData,
                source,
              })
            }
          } else {
            analysis.missingItems.push({ id: itemId, source })
          }
        } catch (error: any) {
          analysis.invalidItems.push({
            id: itemId,
            reason: `Fetch error: ${error.message}`,
            source,
          })
        }
      }
    }

    return {
      status: analysis.validItems.length > 0 ? "success" : "error",
      data: analysis,
    }
  } catch (error: any) {
    return {
      status: "error",
      data: { error: error.message },
    }
  }
}

async function simulateContentDelivery(items: any[], userId: string) {
  try {
    const deliveryResults = {
      successful: [],
      failed: [],
      totalSize: 0,
      estimatedDownloadTime: 0,
    }

    for (const item of items) {
      try {
        // Simulate URL access check
        const urlCheck = await fetch(item.fileUrl, { method: "HEAD" })

        if (urlCheck.ok) {
          deliveryResults.successful.push({
            id: item.id,
            title: item.title,
            size: item.fileSize,
            contentType: item.contentType,
            accessible: true,
          })
          deliveryResults.totalSize += item.fileSize
        } else {
          deliveryResults.failed.push({
            id: item.id,
            title: item.title,
            reason: `HTTP ${urlCheck.status}`,
            accessible: false,
          })
        }
      } catch (error: any) {
        deliveryResults.failed.push({
          id: item.id,
          title: item.title,
          reason: error.message,
          accessible: false,
        })
      }
    }

    // Estimate download time (assuming 10 Mbps connection)
    deliveryResults.estimatedDownloadTime = Math.ceil(deliveryResults.totalSize / ((10 * 1024 * 1024) / 8))

    return {
      success: deliveryResults.failed.length === 0,
      data: deliveryResults,
    }
  } catch (error: any) {
    return {
      success: false,
      data: { error: error.message },
    }
  }
}

function getContentType(mimeType: string): string {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

function generateRecommendations(result: ComprehensiveDebugResult, logs: PurchaseFlowLog[]) {
  const errorLogs = logs.filter((log) => log.status === "error")
  const warningLogs = logs.filter((log) => log.status === "warning")

  // Stripe-related recommendations
  if (errorLogs.some((log) => log.stage === "Stripe Verification")) {
    result.recommendations.push("Verify Stripe webhook configuration and secret keys")
    result.recommendations.push("Check if session ID format is correct (cs_live_... or cs_test_...)")
  }

  // Firestore-related recommendations
  if (errorLogs.some((log) => log.stage === "Firestore Lookup")) {
    result.recommendations.push("Ensure purchase records are being created properly in webhooks")
    result.recommendations.push("Check Firestore security rules for read permissions")
  }

  // Bundle content recommendations
  if (result.bundleContent?.contentAnalysis) {
    const analysis = result.bundleContent.contentAnalysis
    if (analysis.missingItems?.length > 0) {
      result.recommendations.push(`${analysis.missingItems.length} content items are missing from database`)
    }
    if (analysis.invalidItems?.length > 0) {
      result.recommendations.push(`${analysis.invalidItems.length} content items have invalid data`)
    }
    if (analysis.duplicateItems?.length > 0) {
      result.recommendations.push(`${analysis.duplicateItems.length} duplicate items found - cleanup recommended`)
    }
  }

  // Delivery recommendations
  if (result.deliveryData?.failed?.length > 0) {
    result.recommendations.push(`${result.deliveryData.failed.length} items failed delivery simulation`)
    result.recommendations.push("Check R2/CloudFlare storage configuration and file URLs")
  }

  // Performance recommendations
  const totalDuration = result.summary.totalDuration
  if (totalDuration > 5000) {
    result.recommendations.push("Debug process took over 5 seconds - consider optimizing database queries")
  }

  // General recommendations
  if (result.summary.errorStages > 0) {
    result.recommendations.push("Critical errors detected - immediate attention required")
  }
  if (result.summary.warningStages > 2) {
    result.recommendations.push("Multiple warnings detected - system health check recommended")
  }
}
