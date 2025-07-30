import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { retrieveSessionSmart } from "@/lib/stripe"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    console.log("📝 [Verify Session] Request body:", { ...body, idToken: "[REDACTED]" })

    const { sessionId, idToken } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Verify Session] Processing session:", sessionId)

    // Verify Firebase token if provided
    let userId = null
    if (idToken) {
      try {
        console.log("🔐 [Verify Session] Verifying Firebase token...")
        const decodedToken = await getAdminAuth().verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Verify Session] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Verify Session] Token verification failed:", error)
        console.log("⚠️ [Verify Session] Continuing without authentication...")
      }
    }

    const db = getAdminDb()

    // Strategy 1: Check if we have this session in our database already
    console.log("🔍 [Verify Session] Strategy 1: Looking for existing purchase record...")
    let connectedAccountId = null
    let creatorId = null
    let existingPurchase = null

    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchaseQuery.empty) {
      existingPurchase = existingPurchaseQuery.docs[0]
      const purchaseData = existingPurchase.data()
      creatorId = purchaseData.creatorId
      connectedAccountId = purchaseData.connectedAccountId
      console.log("📦 [Verify Session] Found existing purchase with:")
      console.log("   - creatorId:", creatorId)
      console.log("   - connectedAccountId:", connectedAccountId)
    }

    // Strategy 2: If no existing purchase, try to find connected accounts from recent sessions
    const connectedAccounts = []

    if (!connectedAccountId) {
      console.log("🔍 [Verify Session] Strategy 2: Searching all connected accounts...")

      // Get all users with Stripe accounts
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

      // Try each connected account
      for (const account of connectedAccounts) {
        try {
          console.log(`🔍 [Verify Session] Trying connected account: ${account.accountId} (${account.username})`)

          const session = await retrieveSessionSmart(sessionId, account.accountId)

          if (session) {
            console.log(`✅ [Verify Session] Found session in connected account: ${account.accountId}`)
            connectedAccountId = account.accountId
            creatorId = account.userId
            break // Found it, stop searching
          }
        } catch (error: any) {
          console.log(`⚠️ [Verify Session] Account ${account.accountId} failed: ${error.message}`)
          continue // Try next account
        }
      }
    }

    // Strategy 3: If we have creatorId but no connected account, get it from creator profile
    if (creatorId && !connectedAccountId) {
      console.log("🔍 [Verify Session] Strategy 3: Getting connected account from creator profile...")
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          connectedAccountId = creatorData?.stripeAccountId
          console.log("🔗 [Verify Session] Found connected account ID from creator:", connectedAccountId)
        }
      } catch (error) {
        console.error("❌ [Verify Session] Failed to get creator's connected account:", error)
      }
    }

    // Final attempt to retrieve the session
    console.log("💳 [Verify Session] Final session retrieval attempt...")
    console.log("   Session ID:", sessionId)
    console.log("   Connected Account ID:", connectedAccountId || "None (will try platform account)")
    console.log("   Creator ID:", creatorId || "Unknown")

    let session
    let retrievalMethod = "unknown"

    try {
      session = await retrieveSessionSmart(sessionId, connectedAccountId)
      retrievalMethod = connectedAccountId ? "connected_account" : "platform_account"

      console.log("✅ [Verify Session] Session retrieved successfully:")
      console.log("   ID:", session.id)
      console.log("   Payment Status:", session.payment_status)
      console.log("   Status:", session.status)
      console.log("   Amount:", session.amount_total)
      console.log("   Currency:", session.currency)
      console.log("   Customer Email:", session.customer_details?.email)
      console.log("   Metadata:", session.metadata)
      console.log("   Retrieval Method:", retrievalMethod)
      console.log("   Connected Account:", connectedAccountId || "Platform")
    } catch (error: any) {
      console.error("❌ [Verify Session] All retrieval strategies failed:", error)

      if (error.type === "StripeInvalidRequestError" && error.message?.includes("No such checkout.session")) {
        console.error("❌ [Verify Session] Session not found in any account")

        return NextResponse.json(
          {
            error: "Session not found",
            details: "This checkout session could not be found in any Stripe account.",
            sessionId,
            sessionPrefix: sessionId.substring(0, 8),
            searchedAccounts: connectedAccounts.length,
            possibleCauses: [
              "Session was created in a connected account that we don't have access to",
              "Session has expired (24 hour limit)",
              "Session was deleted from Stripe dashboard",
              "Connected account was disconnected after session creation",
              "Session was created with different API credentials",
            ],
            debugInfo: {
              hasConnectedAccountId: !!connectedAccountId,
              connectedAccountId: connectedAccountId || null,
              creatorId: creatorId || null,
              retrievalMethod,
              sessionType: sessionId.startsWith("cs_live_") ? "live" : "test",
              stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
              searchedAccountsCount: connectedAccounts.length,
            },
            suggestion: "The session may have been created in a connected account that is no longer accessible.",
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to retrieve session",
          details: error.message,
          type: error.name || "UnknownError",
          sessionId,
          debugInfo: {
            connectedAccountId,
            creatorId,
            retrievalMethod,
            errorType: error.type,
            errorCode: error.code,
          },
        },
        { status: 400 },
      )
    }

    // Validate session status
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Session] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          paymentStatus: session.payment_status,
          sessionStatus: session.status,
          sessionId: session.id,
          details: "The payment for this session has not been completed successfully",
        },
        { status: 400 },
      )
    }

    // SIMPLIFIED BUNDLE INFO FLOW - Single source of truth
    console.log("📦 [Bundle Info] Starting simplified bundle information flow...")

    // Step 1: Get bundle ID from session metadata (primary source)
    const bundleId = session.metadata?.bundleId || session.metadata?.bundle_id
    console.log("📦 [Bundle Info] Bundle ID from session metadata:", bundleId)

    if (!bundleId) {
      console.error("❌ [Bundle Info] No bundle ID found in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session metadata",
          details: "No bundle ID found in session metadata",
          metadata: session.metadata,
        },
        { status: 400 },
      )
    }

    // Step 2: Fetch bundle data from Firestore (single source)
    console.log("📦 [Bundle Info] Fetching bundle from Firestore:", bundleId)
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.error("❌ [Bundle Info] Bundle not found in Firestore:", bundleId)
      return NextResponse.json(
        {
          error: "Bundle not found",
          details: `Bundle with ID ${bundleId} does not exist in Firestore`,
          bundleId,
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()!
    console.log("✅ [Bundle Info] Bundle data retrieved:", {
      id: bundleId,
      title: bundleData.title,
      description: bundleData.description,
      price: bundleData.price,
      fileSize: bundleData.fileSize,
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl,
      thumbnailUrl: bundleData.thumbnailUrl,
      creatorId: bundleData.creatorId,
    })

    // Step 3: Get creator info (single lookup)
    const finalCreatorId = session.metadata?.creatorId || creatorId || bundleData.creatorId
    let creatorData = {}

    if (finalCreatorId) {
      console.log("👤 [Bundle Info] Fetching creator info:", finalCreatorId)
      const creatorDoc = await db.collection("users").doc(finalCreatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()!
        console.log("✅ [Bundle Info] Creator data retrieved:", {
          name: creatorData.displayName || creatorData.name,
          username: creatorData.username,
        })
      }
    }

    // Step 4: Build clean bundle info response
    const bundleInfo = {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      type: "bundle",
      price: bundleData.price || 0,
      thumbnailUrl: bundleData.thumbnailUrl || "",
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
      fileSize: bundleData.fileSize || 0,
      duration: bundleData.duration || 0,
      fileType: bundleData.fileType || "",
      tags: bundleData.tags || [],
      uploadedAt: bundleData.uploadedAt || bundleData.createdAt,
      creator: {
        id: finalCreatorId,
        name: creatorData.displayName || creatorData.name || "Unknown Creator",
        username: creatorData.username || "",
        profilePicture: creatorData.profilePicture || "",
      },
    }

    console.log("✅ [Bundle Info] Bundle info constructed:", {
      bundleId: bundleInfo.id,
      title: bundleInfo.title,
      hasDownloadUrl: !!bundleInfo.downloadUrl,
      creatorName: bundleInfo.creator.name,
    })

    // Handle purchase record creation/update (keep existing logic)
    const finalUserId = userId || session.metadata?.userId
    let purchaseId
    let alreadyProcessed = false

    if (existingPurchase) {
      console.log("ℹ️ [Verify Session] Purchase already exists")
      purchaseId = existingPurchase.id
      alreadyProcessed = true

      // Update the existing purchase with any missing information
      try {
        await existingPurchase.ref.update({
          connectedAccountId: connectedAccountId || null,
          creatorId: finalCreatorId || null,
          retrievalMethod,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        console.log("✅ [Verify Session] Updated existing purchase with new info")
      } catch (updateError) {
        console.error("❌ [Verify Session] Failed to update existing purchase:", updateError)
      }
    } else {
      // Create new purchase record
      console.log("💾 [Verify Session] Creating new purchase record...")

      const purchaseData = {
        sessionId,
        bundleId,
        itemId: bundleId,
        itemType: "bundle",
        userId: finalUserId,
        creatorId: finalCreatorId || null,
        connectedAccountId: connectedAccountId || null,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email || null,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeSessionId: sessionId,
        verificationMethod: "direct_api",
        retrievalMethod,
        verifiedAt: new Date(),
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      purchaseId = purchaseRef.id
      console.log("✅ [Verify Session] Purchase record created:", purchaseId)

      // Grant user access if we have a user ID
      if (finalUserId) {
        console.log("🔓 [Verify Session] Granting user access...")
        try {
          // Add to user's purchases subcollection
          await db.collection("users").doc(finalUserId).collection("purchases").doc(purchaseId).set({
            bundleId,
            itemId: bundleId,
            itemType: "bundle",
            purchaseId,
            sessionId,
            amount: session.amount_total,
            purchasedAt: new Date(),
            status: "active",
          })

          // Update user's main document with bundle access
          await db
            .collection("users")
            .doc(finalUserId)
            .update({
              [`bundleAccess.${bundleId}`]: {
                purchaseId,
                sessionId,
                grantedAt: new Date(),
                accessType: "purchased",
              },
              updatedAt: new Date(),
            })

          console.log("✅ [Verify Session] User access granted")
        } catch (error) {
          console.error("❌ [Verify Session] Failed to grant user access:", error)
        }
      }
    }

    console.log("✅ [Verify Session] Verification completed successfully")

    // Return simplified response with clean bundle info
    const response = {
      success: true,
      alreadyProcessed,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        payment_status: session.payment_status,
        customerEmail: session.customer_details?.email,
        created: new Date(session.created * 1000).toISOString(),
        connectedAccount: connectedAccountId,
        retrievalMethod,
      },
      purchase: {
        id: purchaseId,
        bundleId,
        itemId: bundleId,
        itemType: "bundle",
        userId: finalUserId,
        creatorId: finalCreatorId,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        purchasedAt: new Date(),
      },
      item: bundleInfo,
    }

    console.log("📤 [Verify Session] Sending clean response:", {
      success: response.success,
      alreadyProcessed: response.alreadyProcessed,
      sessionId: response.session.id,
      bundleTitle: response.item.title,
      hasDownloadUrl: !!response.item.downloadUrl,
      creatorName: response.item.creator.name,
    })

    return NextResponse.json(response)
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
