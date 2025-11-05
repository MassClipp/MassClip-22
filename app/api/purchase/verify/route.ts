import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { retrieveSessionSmart } from "@/lib/stripe"
import { getAdminDb } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Purchase] Starting purchase verification...")

    const body = await request.json()
    const { sessionId, userId } = body

    if (!sessionId) {
      console.error("❌ [Verify Purchase] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Verify Purchase] Processing session:", sessionId)
    console.log("👤 [Verify Purchase] User ID:", userId)

    const db = getAdminDb()

    // Try to retrieve the session from Stripe
    let session
    let connectedAccountId = null

    // First, try to find if we have this session in our database
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchaseQuery.empty) {
      const existingPurchase = existingPurchaseQuery.docs[0]
      const purchaseData = existingPurchase.data()
      connectedAccountId = purchaseData.connectedAccountId
      console.log("📦 [Verify Purchase] Found existing purchase with connected account:", connectedAccountId)
    }

    // Try to retrieve the session
    try {
      session = await retrieveSessionSmart(sessionId, connectedAccountId)
      console.log("✅ [Verify Purchase] Session retrieved successfully")
    } catch (error: any) {
      console.error("❌ [Verify Purchase] Failed to retrieve session:", error)
      return NextResponse.json(
        {
          error: "Failed to retrieve session",
          details: error.message,
        },
        { status: 400 },
      )
    }

    // Validate session
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Purchase] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          paymentStatus: session.payment_status,
        },
        { status: 400 },
      )
    }

    // Extract bundle information from session metadata
    const bundleId = session.metadata?.bundleId || session.metadata?.bundle_id
    const creatorId = session.metadata?.creatorId

    if (!bundleId) {
      console.error("❌ [Verify Purchase] No bundle ID in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session",
          details: "No bundle ID found in session metadata",
        },
        { status: 400 },
      )
    }

    // Fetch bundle data from Firestore
    console.log("📦 [Verify Purchase] Fetching bundle data for:", bundleId)
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.error("❌ [Verify Purchase] Bundle not found:", bundleId)
      return NextResponse.json(
        {
          error: "Bundle not found",
          details: `Bundle with ID ${bundleId} does not exist`,
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()!
    console.log("✅ [Verify Purchase] Bundle data retrieved:", {
      title: bundleData.title,
      price: bundleData.price,
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl,
    })

    // Fetch creator data
    let creatorData = {}
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()!
        console.log("✅ [Verify Purchase] Creator data retrieved")
      }
    }

    // Return success response with complete bundle information
    const response = {
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      },
      purchase: {
        bundleId,
        creatorId,
        amount: session.amount_total,
        currency: session.currency,
      },
      item: {
        id: bundleId,
        title: bundleData.title || "Bundle",
        description: bundleData.description || "",
        type: "bundle",
        price: bundleData.price || 0,
        thumbnailUrl: bundleData.thumbnailUrl || "",
        downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
        fileSize: bundleData.fileSize || 0,
        duration: bundleData.duration || 0,
        fileType: bundleData.fileType || "",
        tags: bundleData.tags || [],
        creator: {
          id: creatorId,
          name: creatorData.displayName || creatorData.name || "Unknown Creator",
          username: creatorData.username || "",
        },
      },
    }

    console.log("📤 [Verify Purchase] Sending response with bundle data:", {
      bundleTitle: response.item.title,
      hasDownloadUrl: !!response.item.downloadUrl,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Verify Purchase] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
