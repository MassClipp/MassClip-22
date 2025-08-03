import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
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
      }
    }

    // Use provided userId or authenticated UserId
    const finalUserId = userId || authenticatedUserId

    if (!finalUserId) {
      console.error("❌ [Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Purchases API] Fetching purchases for user:", finalUserId)

    // Query bundlePurchases collection for this buyer
    const purchasesSnapshot = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", finalUserId)
      .orderBy("purchasedAt", "desc")
      .get()

    console.log(`📊 [Purchases API] Found ${purchasesSnapshot.size} purchases in bundlePurchases`)

    const purchases: any[] = []
    purchasesSnapshot.forEach((doc) => {
      const data = doc.data()
      purchases.push({
        id: doc.id,
        sessionId: data.sessionId,
        itemId: data.itemId,
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
        accessUrl: data.accessUrl || `/bundles/${data.itemId}`,
        accessGranted: data.accessGranted || true,
        downloadCount: data.downloadCount || 0,
        buyerEmail: data.buyerEmail || "",
        buyerName: data.buyerName || "",
        environment: data.environment || "unknown",
      })
    })

    console.log("✅ [Purchases API] Returning", purchases.length, "purchases from bundlePurchases")
    return NextResponse.json({ purchases })
  } catch (error) {
    console.error("❌ [Purchases API] Error fetching user purchases:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
