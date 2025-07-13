import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productBoxId, creatorId, sessionId, userId, userEmail } = body

    console.log("🔍 [Verify & Grant] Starting process", {
      productBoxId,
      creatorId,
      sessionId,
      userId,
      userEmail,
    })

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    // Try to get authenticated user
    let authenticatedUserId = userId
    let authenticatedUserEmail = userEmail

    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth.verifyIdToken(idToken)
        authenticatedUserId = decodedToken.uid
        authenticatedUserEmail = decodedToken.email || userEmail
        console.log("✅ [Verify & Grant] Authenticated user:", {
          uid: authenticatedUserId,
          email: authenticatedUserEmail,
        })
      } catch (authError) {
        console.warn("⚠️ [Verify & Grant] Auth token verification failed:", authError)
      }
    }

    // Get bundle/product box information
    let bundleData = null
    let bundleTitle = "Unknown Bundle"
    let bundleDescription = ""
    let thumbnailUrl = ""
    let creatorUsername = "Unknown Creator"

    // Try bundles collection first
    try {
      const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()
        bundleTitle = bundleData?.title || bundleTitle
        bundleDescription = bundleData?.description || ""
        thumbnailUrl = bundleData?.customPreviewThumbnail || bundleData?.thumbnailUrl || ""
        creatorUsername = bundleData?.creatorUsername || creatorUsername
        console.log("✅ [Verify & Grant] Found bundle data")
      }
    } catch (bundleError) {
      console.warn("⚠️ [Verify & Grant] Failed to fetch bundle:", bundleError)
    }

    // Try productBoxes collection as fallback
    if (!bundleData) {
      try {
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (productBoxDoc.exists) {
          bundleData = productBoxDoc.data()
          bundleTitle = bundleData?.title || bundleTitle
          bundleDescription = bundleData?.description || ""
          thumbnailUrl = bundleData?.thumbnailUrl || ""
          creatorUsername = bundleData?.creatorUsername || creatorUsername
          console.log("✅ [Verify & Grant] Found product box data")
        }
      } catch (productBoxError) {
        console.warn("⚠️ [Verify & Grant] Failed to fetch product box:", productBoxError)
      }
    }

    // Get content items for this bundle
    const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

    const contentItems = contentQuery.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        contentId: doc.id,
        title: data.title || data.filename || "Untitled",
        originalTitle: data.originalTitle || data.title || data.filename || "Untitled",
        filename: data.filename || data.title || "download",
        fileUrl: data.fileUrl || data.downloadUrl || "",
        downloadUrl: data.fileUrl || data.downloadUrl || "",
        url: data.fileUrl || data.downloadUrl || "",
        mimeType: data.mimeType || "application/octet-stream",
        contentType: data.mimeType || "application/octet-stream",
        fileSize: data.fileSize || 0,
        thumbnailUrl: data.thumbnailUrl || "",
        previewUrl: data.thumbnailUrl || "",
        duration: data.duration,
        description: data.description || "",
        resolution: data.resolution || data.dimensions,
        dimensions: data.resolution || data.dimensions,
      }
    })

    console.log(`✅ [Verify & Grant] Found ${contentItems.length} content items`)

    // Create purchase record data
    const purchaseData = {
      buyerUid: authenticatedUserId || "anonymous",
      buyerEmail: authenticatedUserEmail || "unknown",
      bundleId: productBoxId,
      productBoxId: productBoxId,
      bundleTitle: bundleTitle,
      bundleDescription: bundleDescription,
      thumbnailUrl: thumbnailUrl,
      creatorId: creatorId || "unknown",
      creatorUsername: creatorUsername,
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      contentCount: contentItems.length,
      contents: contentItems,
      sessionId: sessionId || null,
      amount: bundleData?.price || 0,
      currency: "usd",
      paymentMethod: "stripe",
      accessGranted: true,
      accessToken: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    // Store purchase in multiple locations for reliability
    const batch = db.batch()
    const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 1. Main bundlePurchases collection
    const bundlePurchaseRef = db.collection("bundlePurchases").doc(purchaseId)
    batch.set(bundlePurchaseRef, purchaseData)

    // 2. User's personal purchases (if authenticated)
    if (authenticatedUserId && authenticatedUserId !== "anonymous") {
      const userPurchaseRef = db
        .collection("userPurchases")
        .doc(authenticatedUserId)
        .collection("purchases")
        .doc(purchaseId)
      batch.set(userPurchaseRef, purchaseData)

      // 3. Also add to purchases collection for API compatibility
      const purchaseRef = db.collection("purchases").doc(purchaseId)
      batch.set(purchaseRef, {
        ...purchaseData,
        userId: authenticatedUserId,
        type: "bundle",
      })
    }

    // Execute batch write
    await batch.commit()

    console.log("✅ [Verify & Grant] Purchase records created successfully", {
      purchaseId,
      buyerUid: purchaseData.buyerUid,
      bundleTitle,
      contentCount: contentItems.length,
    })

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Access granted successfully",
      purchaseId,
      bundleTitle,
      contentCount: contentItems.length,
      redirectUrl: `/product-box/${productBoxId}/content`,
      purchaseData: {
        id: purchaseId,
        bundleTitle,
        contentCount: contentItems.length,
        status: "completed",
      },
    })
  } catch (error: any) {
    console.error("❌ [Verify & Grant] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify purchase and grant access",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
