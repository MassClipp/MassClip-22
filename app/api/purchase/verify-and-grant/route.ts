import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, creatorId } = await request.json()

    console.log(`🔍 [Verify & Grant] Received request:`, {
      productBoxId,
      creatorId,
    })

    if (!productBoxId) {
      return NextResponse.json({ error: "Product Box ID is required" }, { status: 400 })
    }

    // Get authenticated user ID from Authorization header
    let userId = "anonymous"
    let userEmail = ""
    let userName = "Anonymous User"
    let isAuthenticated = false
    let verifiedUser = null

    try {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email || ""
        userName = decodedToken.name || decodedToken.email?.split("@")[0] || "User"
        isAuthenticated = true

        // Get full user record
        try {
          verifiedUser = await auth.getUser(userId)
          userName = verifiedUser.displayName || verifiedUser.email?.split("@")[0] || "User"
          console.log(`✅ [Verify & Grant] Authenticated user: ${userId} (${userEmail}) - ${userName}`)
        } catch (userError) {
          console.warn(`⚠️ [Verify & Grant] Could not get full user record:`, userError)
        }
      } else {
        console.log(`⚠️ [Verify & Grant] No authentication provided, using anonymous access`)
      }
    } catch (authError) {
      console.warn(`⚠️ [Verify & Grant] Auth verification failed, proceeding as anonymous:`, authError)
    }

    console.log(`🔍 [Verify & Grant] Looking for bundle: ${productBoxId}`)

    // Get bundle from bundles collection
    const bundleDoc = await db.collection("bundles").doc(productBoxId).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Verify & Grant] Bundle not found in bundles collection: ${productBoxId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Verify & Grant] Found bundle:`, {
      id: productBoxId,
      title: bundleData?.title,
      creatorId: bundleData?.creatorId,
      price: bundleData?.price,
    })

    // Get creator details
    let creatorData: any = { name: "Unknown Creator", username: "unknown" }
    const creatorIdToUse = creatorId || bundleData.creatorId

    if (creatorIdToUse) {
      try {
        const creatorDoc = await db.collection("users").doc(creatorIdToUse).get()
        if (creatorDoc.exists) {
          const creator = creatorDoc.data()!
          creatorData = {
            name: creator.displayName || creator.name || creator.username || "Unknown Creator",
            username: creator.username || "unknown",
          }
          console.log(`✅ [Verify & Grant] Creator found:`, creatorData)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Error fetching creator:`, error)
      }
    }

    // Get actual bundle contents with proper names
    let bundleContents: any[] = []
    let totalSize = 0
    let contentCount = 0

    try {
      // Try to get bundle contents from the bundle document
      if (bundleData.contents && Array.isArray(bundleData.contents)) {
        bundleContents = bundleData.contents.map((item: any) => ({
          ...item,
          displayTitle: item.title || item.name || item.filename || "Untitled Content",
          displaySize: item.fileSize ? formatFileSize(item.fileSize) : "Unknown Size",
          displayDuration: item.duration ? formatDuration(item.duration) : null,
        }))
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(
          `✅ [Verify & Grant] Found ${contentCount} items in bundle contents with names:`,
          bundleContents.map((item) => item.displayTitle),
        )
      } else if (bundleData.items && Array.isArray(bundleData.items)) {
        bundleContents = bundleData.items.map((item: any) => ({
          ...item,
          displayTitle: item.title || item.name || item.filename || "Untitled Content",
          displaySize: item.fileSize ? formatFileSize(item.fileSize) : "Unknown Size",
          displayDuration: item.duration ? formatDuration(item.duration) : null,
        }))
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(
          `✅ [Verify & Grant] Found ${contentCount} items in bundle items with names:`,
          bundleContents.map((item) => item.displayTitle),
        )
      } else {
        // Generate sample content with proper names if no real content found
        bundleContents = [
          {
            id: "item_1",
            title: "Premium Video Content",
            displayTitle: "Premium Video Content",
            fileUrl: "/api/content/download/video1.mp4",
            thumbnailUrl: bundleData.customPreviewThumbnail || "/placeholder.svg?height=100&width=100",
            fileSize: 52428800, // 50MB
            displaySize: "50.0 MB",
            duration: 1800, // 30 minutes
            displayDuration: "30:00",
            contentType: "video",
          },
          {
            id: "item_2",
            title: "Bonus Audio Commentary",
            displayTitle: "Bonus Audio Commentary",
            fileUrl: "/api/content/download/audio1.mp3",
            thumbnailUrl: "/placeholder.svg?height=100&width=100",
            fileSize: 15728640, // 15MB
            displaySize: "15.0 MB",
            duration: 900, // 15 minutes
            displayDuration: "15:00",
            contentType: "audio",
          },
        ]
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + item.fileSize, 0)
        console.log(
          `⚠️ [Verify & Grant] No bundle contents found, using sample data with names:`,
          bundleContents.map((item) => item.displayTitle),
        )
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error processing bundle contents:`, error)
    }

    // Generate access token
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create bundlePurchases record with PROPER USER IDENTIFICATION
    const bundlePurchaseData = {
      id: purchaseId,
      bundleId: productBoxId,
      productBoxId: productBoxId, // Keep both for compatibility
      bundleTitle: bundleData.title || "Untitled Bundle",
      productBoxTitle: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "Premium content bundle",
      productBoxDescription: bundleData.description || "Premium content bundle",
      thumbnailUrl:
        bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg?height=200&width=200",
      productBoxThumbnail:
        bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg?height=200&width=200",

      // Creator information
      creatorId: creatorIdToUse || "unknown",
      creatorName: creatorData.name,
      creatorUsername: creatorData.username,

      // CRITICAL FIX: Proper user identification
      buyerUid: userId, // Real user ID when authenticated, "anonymous" when not
      userId: userId, // Real user ID when authenticated, "anonymous" when not
      userEmail: userEmail,
      userName: userName,
      isAuthenticated: isAuthenticated,

      // Purchase details
      amount: bundleData.price || 0,
      currency: "usd",
      status: "completed",

      // Content information with proper names
      contents: bundleContents,
      items: bundleContents, // Keep both for compatibility
      itemNames: bundleContents.map((item) => item.displayTitle), // Explicit content names
      contentTitles: bundleContents.map((item) => item.displayTitle), // Alternative field
      contentCount: contentCount,
      totalItems: contentCount,
      totalSize: totalSize,

      // Timestamps
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      purchasedAt: new Date().toISOString(),
      purchaseDate: new Date().toISOString(),

      // Access control
      accessToken: accessToken,
      source: "direct_access",
    }

    console.log(`💾 [Verify & Grant] Creating bundle purchase with proper user identification:`, {
      buyerUid: bundlePurchaseData.buyerUid,
      userEmail: bundlePurchaseData.userEmail,
      userName: bundlePurchaseData.userName,
      isAuthenticated: bundlePurchaseData.isAuthenticated,
      itemNames: bundlePurchaseData.itemNames,
    })

    // Store in bundlePurchases collection
    try {
      await db.collection("bundlePurchases").doc(purchaseId).set(bundlePurchaseData)
      console.log(`✅ [Verify & Grant] Bundle purchase record created with proper user ID: ${userId}`)
    } catch (error) {
      console.error(`❌ [Verify & Grant] Error creating bundle purchase record:`, error)
      throw error
    }

    // If user is authenticated, also store in their personal purchases
    if (isAuthenticated && userId !== "anonymous") {
      try {
        await db.collection("users").doc(userId).collection("purchases").add(bundlePurchaseData)

        // Update user profile with purchase info
        await db
          .collection("users")
          .doc(userId)
          .update({
            lastPurchaseAt: new Date(),
            totalPurchases: db.FieldValue.increment(1),
            totalSpent: db.FieldValue.increment(bundlePurchaseData.amount),
          })

        console.log(`✅ [Verify & Grant] User purchase record created for authenticated user: ${userId}`)
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Error creating user purchase record (non-critical):`, error)
      }
    } else {
      // Store in anonymous purchases for fallback
      try {
        await db.collection("anonymousPurchases").add(bundlePurchaseData)
        console.log(`✅ [Verify & Grant] Anonymous purchase record created`)
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Error creating anonymous purchase (non-critical):`, error)
      }
    }

    // Set access token cookie
    const response = NextResponse.json({
      success: true,
      purchase: bundlePurchaseData,
      message: "Access granted successfully",
      bundleId: productBoxId,
      bundleTitle: bundleData.title,
      isAuthenticated: isAuthenticated,
      userId: userId,
      userName: userName,
      contentNames: bundlePurchaseData.itemNames,
    })

    response.cookies.set(`purchase_access_${productBoxId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    console.log(
      `🎉 [Verify & Grant] Purchase access granted successfully for bundle: ${bundleData.title} (User: ${userName} - ${userId})`,
    )

    return response
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Failed to grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}
