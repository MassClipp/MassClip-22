import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  console.log("🔄 [Purchases API] Starting request processing...")

  try {
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    console.log("📋 [Purchases API] Query userId:", userId)

    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    console.log("🔐 [Purchases API] Auth header present:", !!authHeader)

    let authenticatedUserId: string | null = null

    // Verify auth token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      console.log("🔍 [Purchases API] Attempting to verify token...")

      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
        console.log("✅ [Purchases API] Authenticated user:", authenticatedUserId)
      } catch (tokenError: any) {
        console.error("❌ [Purchases API] Token verification failed:", tokenError.message)
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

    // Use provided userId or authenticated UserId (they're the same - Firebase user ID)
    const buyerUid = userId || authenticatedUserId

    if (!buyerUid) {
      console.error("❌ [Purchases API] No user ID provided")
      return NextResponse.json(
        {
          error: "User ID required",
          details: "Either provide userId parameter or valid auth token",
          code: "MISSING_USER_ID",
        },
        { status: 400 },
      )
    }

    console.log("🔍 [Purchases API] Fetching purchases for buyerUid:", buyerUid)

    // Test Firebase connection first
    try {
      console.log("🔍 [Purchases API] Testing Firebase connection...")
      const testQuery = await db.collection("bundlePurchases").limit(1).get()
      console.log("✅ [Purchases API] Firebase connection successful, collection has", testQuery.size, "documents")
    } catch (connectionError: any) {
      console.error("❌ [Purchases API] Firebase connection failed:", connectionError.message)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: connectionError.message,
          code: "FIREBASE_CONNECTION_ERROR",
        },
        { status: 500 },
      )
    }

    // Query bundlePurchases collection ONLY (single source of truth)
    try {
      console.log("🔍 [Purchases API] Querying bundlePurchases for buyerUid:", buyerUid)

      const purchasesSnapshot = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", buyerUid)
        .orderBy("purchasedAt", "desc")
        .get()

      console.log(`📊 [Purchases API] Query completed. Found ${purchasesSnapshot.size} purchases`)

      const purchases: any[] = []
      purchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`📦 [Purchases API] Processing purchase: ${doc.id} - ${data.title}`)

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

      console.log("✅ [Purchases API] Successfully processed", purchases.length, "purchases")

      return NextResponse.json({
        purchases,
        debug: {
          buyerUid,
          totalFound: purchases.length,
          queryExecuted: true,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (queryError: any) {
      console.error("❌ [Purchases API] Firestore query failed:", queryError)
      console.error("❌ [Purchases API] Query error details:", {
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
    console.error("❌ [Purchases API] Unexpected error:", error)
    console.error("❌ [Purchases API] Error stack:", error.stack)

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
