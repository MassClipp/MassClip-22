import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

/**
 * READ-ONLY: Get user's purchases from bundlePurchases collection
 * This route only reads data - it does NOT handle fulfillment
 */
export async function GET(request: NextRequest) {
  console.log("📖 [Get Purchases] Starting read-only request...")

  try {
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    console.log("📋 [Get Purchases] Query userId:", userId)

    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    console.log("🔐 [Get Purchases] Auth header present:", !!authHeader)

    let authenticatedUserId: string | null = null

    // Verify auth token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      console.log("🔍 [Get Purchases] Attempting to verify token...")

      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
        console.log("✅ [Get Purchases] Authenticated user:", authenticatedUserId)
      } catch (tokenError: any) {
        console.error("❌ [Get Purchases] Token verification failed:", tokenError.message)
        return NextResponse.json(
          {
            error: "Authentication failed",
            details: tokenError.message,
            code: "AUTH_TOKEN_INVALID",
          },
          { status: 401 },
        )
      }
    }

    // Use provided userId or authenticated UserId
    const buyerUid = userId || authenticatedUserId

    if (!buyerUid) {
      console.error("❌ [Get Purchases] No user ID provided")
      return NextResponse.json(
        {
          error: "User ID required",
          details: "Either provide userId parameter or valid auth token",
          code: "MISSING_USER_ID",
        },
        { status: 400 },
      )
    }

    console.log("🔍 [Get Purchases] Fetching purchases for buyerUid:", buyerUid)

    // Test Firebase connection first
    try {
      console.log("🔍 [Get Purchases] Testing Firebase connection...")
      const testQuery = await db.collection("bundlePurchases").limit(1).get()
      console.log("✅ [Get Purchases] Firebase connection successful, collection has", testQuery.size, "documents")
    } catch (connectionError: any) {
      console.error("❌ [Get Purchases] Firebase connection failed:", connectionError.message)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: connectionError.message,
          code: "FIREBASE_CONNECTION_ERROR",
        },
        { status: 500 },
      )
    }

    // Query bundlePurchases collection with fallback for missing index
    try {
      console.log("🔍 [Get Purchases] Querying bundlePurchases for buyerUid:", buyerUid)

      let purchasesSnapshot
      let indexUsed = "none"

      try {
        // Try the optimized query with createdAt ordering first
        console.log("🔍 [Get Purchases] Attempting query with createdAt ordering...")
        purchasesSnapshot = await db
          .collection("bundlePurchases")
          .where("buyerUid", "==", buyerUid)
          .orderBy("createdAt", "desc")
          .get()
        indexUsed = "createdAt"
        console.log("✅ [Get Purchases] Query with createdAt successful")
      } catch (createdAtError: any) {
        console.warn("⚠️ [Get Purchases] createdAt index missing, trying purchasedAt:", createdAtError.message)

        try {
          // Try with purchasedAt ordering
          purchasesSnapshot = await db
            .collection("bundlePurchases")
            .where("buyerUid", "==", buyerUid)
            .orderBy("purchasedAt", "desc")
            .get()
          indexUsed = "purchasedAt"
          console.log("✅ [Get Purchases] Query with purchasedAt successful")
        } catch (purchasedAtError: any) {
          console.warn("⚠️ [Get Purchases] purchasedAt index missing, using simple query:", purchasedAtError.message)

          // Fallback to simple query without ordering if indexes are missing
          purchasesSnapshot = await db.collection("bundlePurchases").where("buyerUid", "==", buyerUid).get()
          indexUsed = "simple"
          console.log("✅ [Get Purchases] Simple query successful")
        }
      }

      console.log(
        `📊 [Get Purchases] Query completed using ${indexUsed} index. Found ${purchasesSnapshot.size} purchases`,
      )

      const purchases: any[] = []
      const docs = purchasesSnapshot.docs

      // Sort manually if we used the simple query
      if (docs.length > 0 && indexUsed === "simple") {
        console.log("🔄 [Get Purchases] Manually sorting results...")
        docs.sort((a, b) => {
          const aData = a.data()
          const bData = b.data()
          const aDate = aData.createdAt || aData.purchasedAt || new Date(0)
          const bDate = bData.createdAt || bData.purchasedAt || new Date(0)

          const aTime = aDate.toDate ? aDate.toDate().getTime() : new Date(aDate).getTime()
          const bTime = bDate.toDate ? bDate.toDate().getTime() : new Date(bDate).getTime()

          return bTime - aTime // Descending order (newest first)
        })
      }

      docs.forEach((doc) => {
        const data = doc.data()
        console.log(`📦 [Get Purchases] Processing purchase: ${doc.id} - ${data.title}`)

        // Calculate price properly - prioritize bundlePrice, then purchaseAmount, then amount
        let priceInDollars = 0
        if (data.bundlePrice !== undefined && data.bundlePrice !== null) {
          // bundlePrice is already in dollars
          priceInDollars = Number(data.bundlePrice)
          console.log(`💰 [Get Purchases] Using bundlePrice: $${priceInDollars}`)
        } else if (data.purchaseAmount !== undefined && data.purchaseAmount !== null) {
          // purchaseAmount is in cents
          priceInDollars = Number(data.purchaseAmount) / 100
          console.log(`💰 [Get Purchases] Using purchaseAmount: $${priceInDollars} (converted from ${data.purchaseAmount} cents)`)
        } else if (data.amount !== undefined && data.amount !== null) {
          // amount could be in cents or dollars, check the value
          const amountValue = Number(data.amount)
          if (amountValue > 100) {
            // Likely in cents
            priceInDollars = amountValue / 100
            console.log(`💰 [Get Purchases] Using amount as cents: $${priceInDollars} (converted from ${amountValue} cents)`)
          } else {
            // Likely in dollars
            priceInDollars = amountValue
            console.log(`💰 [Get Purchases] Using amount as dollars: $${priceInDollars}`)
          }
        } else {
          console.warn(`⚠️ [Get Purchases] No price found for purchase ${doc.id}`)
        }

        purchases.push({
          id: doc.id,
          sessionId: data.sessionId || doc.id,
          itemId: data.itemId || data.bundleId || data.productBoxId,
          itemType: data.itemType || (data.bundleId ? "bundle" : "productBox"),
          bundleId: data.bundleId,
          productBoxId: data.productBoxId,
          title: data.title || data.bundleTitle || "Untitled Purchase",
          description: data.description || "",
          thumbnailUrl: data.thumbnailUrl || "",

          // Content details
          contents: data.contents || data.items || [],
          itemNames: data.itemNames || [],
          contentCount: data.contentCount || data.totalItems || 0,
          totalItems: data.totalItems || 0,
          totalSize: data.totalSize || 0,

          // Creator details
          creatorId: data.creatorId || "",
          creatorName: data.creatorName || "Unknown Creator",
          creatorUsername: data.creatorUsername || "",

          // Purchase details - use calculated price
          amount: priceInDollars,
          price: priceInDollars,
          currency: data.currency || "usd",
          status: data.status || "completed",
          purchasedAt: data.purchasedAt || data.createdAt || new Date(),
          createdAt: data.createdAt || data.purchasedAt || new Date(),

          // Access
          accessUrl: data.accessUrl || `/bundles/${data.itemId || data.bundleId}`,
          accessGranted: data.accessGranted !== false,

          // User details
          buyerUid: data.buyerUid,
          userEmail: data.userEmail || "",
          userName: data.userName || "",
          environment: data.environment || "unknown",

          // Metadata
          source: data.source || "webhook",
          webhookProcessed: data.webhookProcessed || false,
          
          // Price metadata for debugging
          priceMetadata: {
            bundlePrice: data.bundlePrice,
            purchaseAmount: data.purchaseAmount,
            amount: data.amount,
            calculatedPrice: priceInDollars
          }
        })
      })

      console.log("✅ [Get Purchases] Successfully processed", purchases.length, "purchases with prices:",
        purchases.map(p => ({ id: p.id, title: p.title, price: p.price }))
      )

      return NextResponse.json({
        success: true,
        purchases,
        debug: {
          buyerUid,
          totalFound: purchases.length,
          queryExecuted: true,
          indexUsed,
          timestamp: new Date().toISOString(),
          note: "READ-ONLY: This route only reads purchase data",
          indexInstructions:
            indexUsed === "simple"
              ? {
                  message: "For better performance, create Firestore indexes",
                  indexes: [
                    {
                      collection: "bundlePurchases",
                      fields: [
                        { field: "buyerUid", order: "ASCENDING" },
                        { field: "createdAt", order: "DESCENDING" },
                      ],
                    },
                    {
                      collection: "bundlePurchases",
                      fields: [
                        { field: "buyerUid", order: "ASCENDING" },
                        { field: "purchasedAt", order: "DESCENDING" },
                      ],
                    },
                  ],
                }
              : null,
        },
      })
    } catch (queryError: any) {
      console.error("❌ [Get Purchases] Firestore query failed:", queryError)
      console.error("❌ [Get Purchases] Query error details:", {
        code: queryError.code,
        message: queryError.message,
        stack: queryError.stack,
      })

      // Check if it's an index error
      if (queryError.code === "failed-precondition" || queryError.message?.includes("index")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database index required",
            details:
              "Firestore needs composite indexes for this query. The query will work but may be slower without indexes.",
            code: "MISSING_INDEX",
            indexUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`,
            requiredIndexes: [
              {
                collection: "bundlePurchases",
                fields: [
                  { field: "buyerUid", order: "ASCENDING" },
                  { field: "createdAt", order: "DESCENDING" },
                ],
              },
            ],
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Database query failed",
          details: queryError.message,
          code: queryError.code || "FIRESTORE_QUERY_ERROR",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Get Purchases] Unexpected error:", error)
    console.error("❌ [Get Purchases] Error stack:", error.stack)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message || "Unknown error occurred",
        code: "INTERNAL_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
