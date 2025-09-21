import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const auth = getAuth()
const db = getFirestore()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle Content API] Starting request for bundle: ${bundleId}`)

    // Get the authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Bundle Content API] No Bearer token in authorization header")
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      console.error("❌ [Bundle Content API] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid
    console.log(`👤 [Bundle Content API] User UID: ${userUid}`)
    console.log(`📦 [Bundle Content API] Bundle ID: ${bundleId}`)

    try {
      // Get bundle document directly from bundles collection
      const bundleRef = await db.collection("bundles").doc(bundleId).get()

      if (!bundleRef.exists) {
        console.log(`❌ [Bundle Content API] Bundle document not found`)
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const bundleData = bundleRef.data()
      console.log(`✅ [Bundle Content API] Bundle found: ${bundleData.title}`)

      // Check if user is the bundle creator
      const creatorId = bundleData.creatorId
      if (creatorId !== userUid) {
        console.log(`❌ [Bundle Content API] User ${userUid} is not the creator ${creatorId}`)
        return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
      }

      console.log(`✅ [Bundle Content API] User is bundle owner, fetching content details`)

      const detailedContentItems = bundleData.detailedContentItems || []
      const contentItems = bundleData.contentItems || []
      const content = bundleData.content || []

      console.log(`🔍 [Bundle Content API] detailedContentItems:`, detailedContentItems.length)
      console.log(`🔍 [Bundle Content API] contentItems:`, contentItems.length)
      console.log(`🔍 [Bundle Content API] content:`, content.length)

      // Use whichever content array has data
      let finalContentItems = []
      if (detailedContentItems.length > 0) {
        finalContentItems = detailedContentItems
        console.log(`✅ [Bundle Content API] Using detailedContentItems (${finalContentItems.length} items)`)
      } else if (contentItems.length > 0) {
        finalContentItems = contentItems.map((item, index) => ({
          id: item.id || item,
          title: item.title || `Video ${index + 1}`,
          description: item.description || "",
          contentType: "video",
          thumbnailUrl: item.thumbnailUrl || "",
          fileUrl: item.fileUrl || item.videoUrl || "",
          downloadUrl: item.downloadUrl || item.fileUrl || "",
          videoUrl: item.fileUrl || item.videoUrl || "",
          ...item,
        }))
        console.log(`✅ [Bundle Content API] Using contentItems (${finalContentItems.length} items)`)
      } else if (content.length > 0) {
        finalContentItems = content.map((item, index) => ({
          id: item.id || item,
          title: item.title || `Video ${index + 1}`,
          description: item.description || "",
          contentType: "video",
          thumbnailUrl: item.thumbnailUrl || "",
          fileUrl: item.fileUrl || item.videoUrl || "",
          downloadUrl: item.downloadUrl || item.fileUrl || "",
          videoUrl: item.fileUrl || item.videoUrl || "",
          ...item,
        }))
        console.log(`✅ [Bundle Content API] Using content (${finalContentItems.length} items)`)
      }

      const response = {
        hasAccess: true,
        bundle: {
          id: bundleId,
          title: bundleData.title || "Untitled Bundle",
          description: bundleData.description || "",
          creatorId: bundleData.creatorId,
          thumbnailUrl: bundleData.coverImage || bundleData.thumbnailUrl || "",
          price: bundleData.price || 0,
          currency: bundleData.currency || "usd",
        },
        contents: finalContentItems,
        isOwner: true,
      }

      console.log(`✅ [Bundle Content API] Returning ${finalContentItems.length} content items`)
      return NextResponse.json(response)
    } catch (error) {
      console.error("❌ [Bundle Content API] Error accessing bundle:", error)
      return NextResponse.json({ error: "Error accessing bundle" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Bundle Content API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
