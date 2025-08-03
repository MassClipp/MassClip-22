import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  console.log("🔄 [Purchases API] Starting request processing...")

  try {
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    let authenticatedUserId: string | null = null

    // Verify auth token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
        console.log("✅ [Purchases API] Authenticated user:", authenticatedUserId)
      } catch (error) {
        console.error("❌ [Purchases API] Error verifying auth token:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    // Use provided userId or authenticated UserId (they're the same - Firebase user ID)
    const buyerUid = userId || authenticatedUserId

    if (!buyerUid) {
      console.error("❌ [Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Purchases API] Fetching purchases for buyerUid:", buyerUid)

    // Query bundlePurchases collection ONLY (single source of truth)
    const purchasesSnapshot = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", buyerUid)
      .orderBy("purchasedAt", "desc")
      .get()

    console.log(`📊 [Purchases API] Found ${purchasesSnapshot.size} purchases for user ${buyerUid}`)

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

    console.log("✅ [Purchases API] Successfully returning", purchases.length, "purchases")
    return NextResponse.json({ purchases })
  } catch (error: any) {
    console.error("❌ [Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
