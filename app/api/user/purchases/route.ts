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
      } catch (error) {
        console.error("❌ [Purchases API] Error verifying auth token:", error)
        return NextResponse.json(
          {
            error: "Invalid authentication token",
            details: error instanceof Error ? error.message : "Token verification failed",
          },
          { status: 401 },
        )
      }
    }

    // Use provided userId or authenticated UserId
    const finalUserId = userId || authenticatedUserId

    if (!finalUserId) {
      console.error("❌ [Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Purchases API] Fetching purchases for user:", finalUserId)

    try {
      // First, let's check if the bundlePurchases collection exists and has any documents
      console.log("🔍 [Purchases API] Checking bundlePurchases collection...")

      const allPurchasesSnapshot = await db.collection("bundlePurchases").limit(5).get()
      console.log(`📊 [Purchases API] Total documents in bundlePurchases collection: ${allPurchasesSnapshot.size}`)

      if (allPurchasesSnapshot.size > 0) {
        console.log("📋 [Purchases API] Sample documents in bundlePurchases:")
        allPurchasesSnapshot.forEach((doc, index) => {
          const data = doc.data()
          console.log(`  ${index + 1}. Doc ID: ${doc.id}, buyerUid: ${data.buyerUid}, title: ${data.title}`)
        })
      }

      // Now query for this specific user's purchases
      console.log(`🔍 [Purchases API] Querying bundlePurchases for buyerUid: ${finalUserId}`)

      const purchasesSnapshot = await db.collection("bundlePurchases").where("buyerUid", "==", finalUserId).get()

      console.log(`📊 [Purchases API] Found ${purchasesSnapshot.size} purchases for user ${finalUserId}`)

      const purchases: any[] = []
      purchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`📦 [Purchases API] Processing purchase: ${doc.id} - ${data.title}`)

        purchases.push({
          id: doc.id,
          sessionId: data.sessionId || doc.id,
          itemId: data.itemId || data.bundleId || data.productBoxId,
          itemType: data.itemType || "bundle",
          bundleId: data.bundleId,
          productBoxId: data.productBoxId,
          title: data.title || "Untitled",
          description: data.description || "",
          thumbnailUrl: data.thumbnailUrl || "",
          downloadUrl: data.downloadUrl || "",
          fileSize: data.fileSize || 0,
          fileType: data.fileType || "",
          duration: data.duration || 0,
          creatorId: data.creatorId || "",
          creatorName: data.creatorName || "Unknown Creator",
          creatorUsername: data.creatorUsername || "",
          amount: data.amount || 0,
          currency: data.currency || "usd",
          status: data.status || "completed",
          purchasedAt: data.purchasedAt || data.createdAt || new Date(),
          accessUrl: data.accessUrl || `/bundles/${data.itemId || data.bundleId}`,
          accessGranted: data.accessGranted !== false, // Default to true
          downloadCount: data.downloadCount || 0,
          buyerEmail: data.buyerEmail || "",
          buyerName: data.buyerName || "",
          environment: data.environment || "unknown",
        })
      })

      console.log("✅ [Purchases API] Successfully processed", purchases.length, "purchases")
      return NextResponse.json({
        purchases,
        debug: {
          totalInCollection: allPurchasesSnapshot.size,
          userPurchases: purchases.length,
          userId: finalUserId,
        },
      })
    } catch (firestoreError: any) {
      console.error("❌ [Purchases API] Firestore query error:", firestoreError)
      console.error("❌ [Purchases API] Error stack:", firestoreError.stack)

      return NextResponse.json(
        {
          error: "Database query failed",
          details: firestoreError.message || "Unknown database error",
          code: firestoreError.code || "unknown",
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
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
