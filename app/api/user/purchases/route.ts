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

      try {
        // Try the optimized query with ordering first
        purchasesSnapshot = await db
          .collection("bundlePurchases")
          .where("buyerUid", "==", buyerUid)
          .orderBy("purchasedAt", "desc")
          .get()
      } catch (indexError: any) {
        console.warn("⚠️ [Get Purchases] Index missing, falling back to simple query:", indexError.message)

        // Fallback to simple query without ordering if index is missing
        purchasesSnapshot = await db.collection("bundlePurchases").where("buyerUid", "==", buyerUid).get()

        console.log("✅ [Get Purchases] Fallback query successful")
      }

      console.log(`📊 [Get Purchases] Query completed. Found ${purchasesSnapshot.size} purchases`)

      const purchases: any[] = []
      const docs = purchasesSnapshot.docs

      // Sort manually if we used the fallback query
      if (docs.length > 0) {
        docs.sort((a, b) => {
          const aDate = a.data().purchasedAt || a.data().createdAt || new Date(0)
          const bDate = b.data().purchasedAt || b.data().createdAt || new Date(0)
          const aTime = aDate.toDate ? aDate.toDate().getTime() : new Date(aDate).getTime()
          const bTime = bDate.toDate ? bDate.toDate().getTime() : new Date(bDate).getTime()
          return bTime - aTime // Descending order
        })
      }

      docs.forEach((doc) => {
        const data = doc.data()
        console.log(`📦 [Get Purchases] Processing purchase: ${doc.id} - ${data.title}`)

        purchases.push({
          id: doc.id,
          sessionId: data.sessionId || doc.id,
          itemId: data.itemId,
          itemType: data.itemType,
          bundleId: data.bundleId,
          productBoxId: data.productBoxId,
          title: data.title || "Untitled",
          description: data.description || "",
          thumbnailUrl: data.thumbnailUrl || "",

          // Content details
          contents: data.contents || data.items || [],
          itemNames: data.itemNames || [],
          contentCount: data.contentCount || 0,
          totalItems: data.totalItems || 0,
          totalSize: data.totalSize || 0,

          // Creator details
          creatorId: data.creatorId || "",
          creatorName: data.creatorName || "Unknown Creator",
          creatorUsername: data.creatorUsername || "",

          // Purchase details
          amount: data.amount || 0,
          currency: data.currency || "usd",
          status: data.status || "completed",
          purchasedAt: data.purchasedAt || data.createdAt || new Date(),

          // Access
          accessUrl: data.accessUrl || `/bundles/${data.itemId}`,
          accessGranted: data.accessGranted !== false,

          // User details
          buyerUid: data.buyerUid,
          userEmail: data.userEmail || "",
          userName: data.userName || "",
          environment: data.environment || "unknown",
        })
      })

      console.log("✅ [Get Purchases] Successfully processed", purchases.length, "purchases")

      return NextResponse.json({
        purchases,
        debug: {
          buyerUid,
          totalFound: purchases.length,
          queryExecuted: true,
          indexUsed: purchasesSnapshot.docs.length > 0 ? "optimized" : "fallback",
          timestamp: new Date().toISOString(),
          note: "READ-ONLY: This route only reads purchase data",
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
            error: "Database index required",
            details: "Firestore needs an index for this query. Check the Firebase console.",
            code: "MISSING_INDEX",
            indexUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
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
        error: "Internal server error",
        details: error.message || "Unknown error occurred",
        code: "INTERNAL_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
