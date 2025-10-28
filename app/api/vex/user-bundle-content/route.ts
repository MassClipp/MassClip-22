import { type NextRequest, NextResponse } from "next/server"
import { auth, isFirebaseAdminInitialized, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  console.log("🔍 [Vex Bundle Content] Starting user bundle content analysis...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Vex Bundle Content] Firebase Admin SDK not initialized")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Vex Bundle Content] No Bearer token provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Vex Bundle Content] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`👤 [Vex Bundle Content] Analyzing bundles for user: ${userId}`)

    // Get all user's bundles
    const bundlesSnapshot = await adminDb.collection("bundles").where("creatorId", "==", userId).get()

    const bundleContentMap: Record<string, any[]> = {}
    const allContentItems: any[] = []
    const contentFrequency: Record<string, number> = {}

    console.log(`📦 [Vex Bundle Content] Found ${bundlesSnapshot.docs.length} bundles`)

    // Process each bundle
    for (const bundleDoc of bundlesSnapshot.docs) {
      const bundleData = bundleDoc.data()
      const bundleId = bundleDoc.id

      // Get content items from different possible fields
      let contentItems: string[] = []

      if (bundleData.detailedContentItems && Array.isArray(bundleData.detailedContentItems)) {
        contentItems = bundleData.detailedContentItems
          .map((item: any) => (typeof item === "string" ? item : item.id || item.contentId))
          .filter(Boolean)
      } else if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
        contentItems = bundleData.contentItems.filter(Boolean)
      } else if (bundleData.content && Array.isArray(bundleData.content)) {
        contentItems = bundleData.content
          .map((item: any) => (typeof item === "string" ? item : item.id || item.contentId))
          .filter(Boolean)
      }

      // Get actual content details for each item
      const contentDetails: any[] = []
      for (const contentId of contentItems) {
        try {
          // Search across multiple collections for the content
          const collections = ["creator_uploads", "free_content", "product_box_content", "bundle_content"]
          let contentData = null

          for (const collectionName of collections) {
            try {
              const contentDoc = await adminDb.collection(collectionName).doc(contentId).get()
              if (contentDoc.exists) {
                contentData = { id: contentId, ...contentDoc.data(), collection: collectionName }
                break
              }
            } catch (error) {
              // Continue to next collection
            }
          }

          if (contentData) {
            contentDetails.push({
              id: contentId,
              title: contentData.title || contentData.name || "Untitled",
              description: contentData.description || "",
              tags: contentData.tags || [],
              category: contentData.category || "",
              fileType: contentData.fileType || contentData.mimeType || "",
              duration: contentData.duration || 0,
              collection: contentData.collection,
            })

            // Track content frequency across bundles
            contentFrequency[contentId] = (contentFrequency[contentId] || 0) + 1
            allContentItems.push(contentData)
          }
        } catch (error) {
          console.warn(`⚠️ [Vex Bundle Content] Error fetching content ${contentId}:`, error)
        }
      }

      bundleContentMap[bundleId] = {
        bundleTitle: bundleData.title || "Untitled Bundle",
        bundleDescription: bundleData.description || "",
        contentCount: contentDetails.length,
        contentItems: contentDetails,
      }
    }

    // Find duplicate content across bundles
    const duplicateContent = Object.entries(contentFrequency)
      .filter(([_, count]) => count > 1)
      .map(([contentId, count]) => ({
        contentId,
        count,
        title: allContentItems.find((item) => item.id === contentId)?.title || "Unknown",
      }))

    // Generate content categories and themes
    const categories = new Set<string>()
    const tags = new Set<string>()

    allContentItems.forEach((item) => {
      if (item.category) categories.add(item.category)
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => tags.add(tag))
      }
    })

    const response = {
      userId,
      totalBundles: bundlesSnapshot.docs.length,
      totalUniqueContent: Object.keys(contentFrequency).length,
      bundleContentMap,
      duplicateContent,
      contentAnalysis: {
        categories: Array.from(categories),
        tags: Array.from(tags),
        mostUsedContent: Object.entries(contentFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([contentId, count]) => ({
            contentId,
            count,
            title: allContentItems.find((item) => item.id === contentId)?.title || "Unknown",
          })),
      },
    }

    console.log(
      `✅ [Vex Bundle Content] Analysis complete: ${response.totalBundles} bundles, ${response.totalUniqueContent} unique items`,
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ [Vex Bundle Content] Error:", error)
    return NextResponse.json({ error: "Failed to analyze bundle content" }, { status: 500 })
  }
}
