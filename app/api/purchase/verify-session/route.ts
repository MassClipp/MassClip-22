import { type NextRequest, NextResponse } from "next/server"
import { retrieveSessionSmart } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"

// Helper function to determine content type from file type
function getContentTypeFromFileType(fileType: string): "video" | "audio" | "image" | "document" {
  if (!fileType) return "document"

  const type = fileType.toLowerCase()
  if (type.includes("video") || type.includes("mp4") || type.includes("mov") || type.includes("avi")) {
    return "video"
  } else if (type.includes("audio") || type.includes("mp3") || type.includes("wav")) {
    return "audio"
  } else if (type.includes("image") || type.includes("jpg") || type.includes("png") || type.includes("gif")) {
    return "image"
  }
  return "document"
}

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
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Verify Session] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Verify Session] Token verification failed:", error)
        console.log("⚠️ [Verify Session] Continuing without authentication...")
      }
    }

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
      console.log("📦 [Verify Session] Found existing purchase with creatorId:", creatorId)
      console.log("🔗 [Verify Session] Connected account from purchase:", connectedAccountId)
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

            // Store this information for future use
            const bundleId = session.metadata?.bundleId

            if (bundleId) {
              console.log("💾 [Verify Session] Caching connected account info for bundle:", bundleId)

              try {
                await db.collection("bundles").doc(bundleId).update({
                  connectedAccountId: connectedAccountId,
                  creatorId: creatorId,
                  updatedAt: new Date(),
                })
                console.log(`✅ [Verify Session] Updated bundle with connected account info`)
              } catch (updateError) {
                console.error(`❌ [Verify Session] Failed to update bundle:`, updateError)
              }
            }

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
          type: error.type || "unknown",
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

    // Extract metadata - only look for bundleId now
    const bundleId = session.metadata?.bundleId
    const sessionUserId = session.metadata?.userId
    const sessionCreatorId = session.metadata?.creatorId || creatorId

    if (!bundleId) {
      console.error("❌ [Verify Session] Missing bundle ID in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session metadata",
          details: "No bundle ID found in session metadata",
          metadata: session.metadata,
        },
        { status: 400 },
      )
    }

    console.log("📦 [Verify Session] Processing bundle purchase:")
    console.log("   Bundle ID:", bundleId)
    console.log("   User ID (auth):", userId)
    console.log("   User ID (session):", sessionUserId)
    console.log("   Creator ID:", sessionCreatorId)
    console.log("   Connected Account:", connectedAccountId)

    // Use authenticated user ID if available, otherwise use session metadata
    const finalUserId = userId || sessionUserId

    // Get bundle details for response
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    const bundleData = bundleDoc.exists ? bundleDoc.data() : {}

    // Get creator details
    const creatorDoc = await db
      .collection("users")
      .doc(sessionCreatorId || creatorId || "")
      .get()
    const creatorData = creatorDoc.exists ? creatorDoc.data() : {}

    // Check if purchase already exists (reuse existing purchase if found)
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
          creatorId: sessionCreatorId || creatorId || null,
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
        creatorId: sessionCreatorId || creatorId || null,
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

      // Update bundle stats
      try {
        await db
          .collection("bundles")
          .doc(bundleId)
          .update({
            "stats.totalSales": db.FieldValue.increment(1),
            "stats.totalRevenue": db.FieldValue.increment(session.amount_total || 0),
            "stats.lastSaleAt": new Date(),
            updatedAt: new Date(),
          })
        console.log(`✅ [Verify Session] Bundle stats updated`)
      } catch (error) {
        console.error(`❌ [Verify Session] Failed to update bundle stats:`, error)
      }
    }

    // CRITICAL: Create purchase records in the collections that the purchases page queries
    console.log("💾 [Verify Session] Creating purchase records for purchases page...")

    // Create the unified purchase record that the purchases page expects
    const unifiedPurchaseData = {
      id: sessionId,
      productBoxId: bundleId, // For compatibility with existing code
      bundleId: bundleId,
      itemId: bundleId,
      productBoxTitle: bundleData?.title || "Bundle",
      productBoxDescription: bundleData?.description || "",
      productBoxThumbnail: bundleData?.thumbnailUrl || "",
      creatorId: sessionCreatorId || creatorId || null,
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      purchasedAt: new Date(),
      status: "completed",
      sessionId: sessionId,
      // Bundle-specific data
      bundleData: {
        id: bundleId,
        title: bundleData?.title || "Bundle",
        description: bundleData?.description || "",
        thumbnailUrl: bundleData?.thumbnailUrl || "",
        fileSize: bundleData?.fileSize || 0,
        duration: bundleData?.duration || 0,
        fileType: bundleData?.fileType || "unknown",
        downloadCount: bundleData?.downloadCount || 0,
        creatorId: sessionCreatorId || creatorId || null,
        createdAt: bundleData?.createdAt || new Date(),
        downloadUrl: bundleData?.downloadUrl || bundleData?.fileUrl || "",
      },
      // Items array for compatibility
      items: bundleData?.downloadUrl
        ? [
            {
              id: bundleId,
              title: bundleData?.title || "Bundle",
              fileUrl: bundleData?.downloadUrl || bundleData?.fileUrl || "",
              thumbnailUrl: bundleData?.thumbnailUrl || "",
              fileSize: bundleData?.fileSize || 0,
              duration: bundleData?.duration || 0,
              contentType: getContentTypeFromFileType(bundleData?.fileType || ""),
            },
          ]
        : [],
      totalItems: 1,
      totalSize: bundleData?.fileSize || 0,
      // User identification
      buyerUid: finalUserId || "anonymous",
      userId: finalUserId || "anonymous",
      userEmail: session.customer_details?.email || "",
      userName: "User",
      isAuthenticated: !!finalUserId,
    }

    try {
      // 1. Create in bundlePurchases collection (for anonymous purchases API)
      await db.collection("bundlePurchases").doc(sessionId).set(unifiedPurchaseData)
      console.log("✅ [Verify Session] Created bundlePurchases record")

      // 2. Create in unifiedPurchases collection (for unified purchases API)
      await db.collection("unifiedPurchases").doc(sessionId).set(unifiedPurchaseData)
      console.log("✅ [Verify Session] Created unifiedPurchases record")

      // 3. If user is authenticated, also create in user's purchases subcollection
      if (finalUserId && finalUserId !== "anonymous") {
        await db.collection("users").doc(finalUserId).collection("purchases").doc(sessionId).set(unifiedPurchaseData)
        console.log("✅ [Verify Session] Created user purchases record")
      }

      // 4. Create session-based purchase record for anonymous access
      await db
        .collection("sessionPurchases")
        .doc(sessionId)
        .set({
          ...unifiedPurchaseData,
          sessionId: sessionId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
      console.log("✅ [Verify Session] Created session-based purchase record")
    } catch (error) {
      console.error("❌ [Verify Session] Failed to create purchase records:", error)
    }

    console.log("✅ [Verify Session] Verification completed successfully")

    return NextResponse.json({
      success: true,
      alreadyProcessed,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: session.payment_status,
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
        creatorId: sessionCreatorId || creatorId,
        amount: session.amount_total || 0,
      },
      item: {
        id: bundleId,
        title: bundleData?.title || "Bundle",
        description: bundleData?.description || "",
        type: "bundle",
        thumbnailUrl: bundleData?.thumbnailUrl || "",
        downloadUrl: bundleData?.downloadUrl || bundleData?.fileUrl || "",
        fileSize: bundleData?.fileSize || 0,
        creator: {
          id: sessionCreatorId || creatorId,
          name: creatorData?.displayName || creatorData?.name || "Unknown Creator",
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
