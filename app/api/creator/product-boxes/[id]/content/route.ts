import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { getAuth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { db } from "@/lib/firebase-admin"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("❌ [Product Box Content API] Firebase Admin initialization error:", error)
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Product Box Content API] Adding content to product box: ${params.id}`)

    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.log("❌ [Product Box Content API] No valid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Product Box Content API] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [Product Box Content API] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    const body = await request.json()
    const { uploadIds } = body

    console.log("📝 [Product Box Content API] Request body:", body)

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      console.log("❌ [Product Box Content API] Invalid upload IDs:", uploadIds)
      return NextResponse.json({ error: "Valid upload IDs array is required" }, { status: 400 })
    }

    console.log(`📝 [Product Box Content API] Adding ${uploadIds.length} uploads:`, uploadIds)

    // Get existing product box
    const productBoxRef = db.collection("productBoxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Content API] Product box not found: ${params.id}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const existingData = productBoxDoc.data()

    // Check if user owns this product box
    if (existingData?.creatorId !== userId) {
      console.log(`❌ [Product Box Content API] Access denied for user ${userId} to product box ${params.id}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Validate that uploads exist and belong to the user
    console.log("🔍 [Product Box Content API] Validating upload ownership")
    for (const uploadId of uploadIds) {
      try {
        const uploadDoc = await db.collection("uploads").doc(uploadId).get()
        if (!uploadDoc.exists) {
          console.log(`❌ [Product Box Content API] Upload not found: ${uploadId}`)
          return NextResponse.json({ error: `Upload ${uploadId} not found` }, { status: 404 })
        }

        const uploadData = uploadDoc.data()
        if (uploadData?.uid !== userId) {
          console.log(`❌ [Product Box Content API] Upload ${uploadId} does not belong to user ${userId}`)
          return NextResponse.json({ error: `Access denied to upload ${uploadId}` }, { status: 403 })
        }
      } catch (uploadError) {
        console.error(`❌ [Product Box Content API] Error validating upload ${uploadId}:`, uploadError)
        return NextResponse.json({ error: `Failed to validate upload ${uploadId}` }, { status: 500 })
      }
    }

    // Create productBoxContent entries for each upload
    console.log("🔄 [Product Box Content API] Creating productBoxContent entries")
    for (const uploadId of uploadIds) {
      try {
        const uploadDoc = await db.collection("uploads").doc(uploadId).get()
        const uploadData = uploadDoc.data()

        if (uploadData) {
          // Create productBoxContent entry
          await db.collection("productBoxContent").add({
            productBoxId: params.id,
            uploadId: uploadId,
            title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
            filename: uploadData.filename || uploadData.originalFileName || `${uploadId}.file`,
            fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl || "",
            thumbnailUrl: uploadData.thumbnailUrl || "",
            mimeType: uploadData.mimeType || uploadData.fileType || "application/octet-stream",
            fileSize: uploadData.fileSize || uploadData.size || 0,
            duration: uploadData.duration || null,
            createdAt: new Date(),
            creatorId: userId,
          })
          console.log(`✅ [Product Box Content API] Created productBoxContent entry for upload: ${uploadId}`)
        }
      } catch (contentError) {
        console.error(`❌ [Product Box Content API] Error creating productBoxContent for ${uploadId}:`, contentError)
      }
    }

    // Merge with existing content items (avoid duplicates)
    const existingContentItems = Array.isArray(existingData?.contentItems) ? existingData.contentItems : []
    const newContentItems = [...new Set([...existingContentItems, ...uploadIds])]

    console.log(
      `📊 [Product Box Content API] Content items: ${existingContentItems.length} -> ${newContentItems.length}`,
    )

    // Update the product box
    await productBoxRef.update({
      contentItems: newContentItems,
      updatedAt: new Date(),
    })

    console.log(`✅ [Product Box Content API] Successfully added content to product box: ${params.id}`)

    return NextResponse.json({
      success: true,
      contentItems: newContentItems,
      addedCount: newContentItems.length - existingContentItems.length,
    })
  } catch (error) {
    console.error(`❌ [Product Box Content API] Error adding content to product box ${params.id}:`, error)

    if (error instanceof Error) {
      console.error("❌ [Product Box Content API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        productBoxId: params.id,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to add content to product box",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Product Box Content API] Removing content from product box: ${params.id}`)

    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.log("❌ [Product Box Content API] No valid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Product Box Content API] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [Product Box Content API] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    const body = await request.json()
    const { uploadId } = body

    if (!uploadId) {
      console.log("❌ [Product Box Content API] Missing upload ID")
      return NextResponse.json({ error: "Upload ID is required" }, { status: 400 })
    }

    console.log(`📝 [Product Box Content API] Removing upload: ${uploadId}`)

    // Get existing product box
    const productBoxRef = db.collection("productBoxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Content API] Product box not found: ${params.id}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const existingData = productBoxDoc.data()

    // Check if user owns this product box
    if (existingData?.creatorId !== userId) {
      console.log(`❌ [Product Box Content API] Access denied for user ${userId} to product box ${params.id}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Remove video from content items
    const existingContentItems = Array.isArray(existingData?.contentItems) ? existingData.contentItems : []
    const newContentItems = existingContentItems.filter((id: string) => id !== uploadId)

    console.log(
      `📊 [Product Box Content API] Content items: ${existingContentItems.length} -> ${newContentItems.length}`,
    )

    // Update the product box
    await productBoxRef.update({
      contentItems: newContentItems,
      updatedAt: new Date(),
    })

    console.log(`✅ [Product Box Content API] Successfully removed content from product box: ${params.id}`)

    return NextResponse.json({
      success: true,
      contentItems: newContentItems,
      removedUploadId: uploadId,
    })
  } catch (error) {
    console.error(`❌ [Product Box Content API] Error removing content from product box ${params.id}:`, error)

    if (error instanceof Error) {
      console.error("❌ [Product Box Content API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        productBoxId: params.id,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to remove content from product box",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Product Box Content API] Fetching content for product box: ${params.id}`)

    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.log("❌ [Product Box Content API] No valid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Product Box Content API] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [Product Box Content API] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get existing product box
    const productBoxRef = db.collection("productBoxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Content API] Product box not found: ${params.id}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()

    // Check if user owns this product box
    if (productBoxData?.creatorId !== userId) {
      console.log(`❌ [Product Box Content API] Access denied for user ${userId} to product box ${params.id}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get content items from productBoxContent collection
    const contentQuery = db.collection("productBoxContent").where("productBoxId", "==", params.id)
    const contentSnapshot = await contentQuery.get()

    const content: any[] = []

    if (!contentSnapshot.empty) {
      contentSnapshot.forEach((doc) => {
        const data = doc.data()
        content.push({
          id: doc.id,
          title: data.title || data.filename || "Untitled",
          fileUrl: data.fileUrl || "",
          thumbnailUrl: data.thumbnailUrl || "",
          mimeType: data.mimeType || "application/octet-stream",
          fileSize: data.fileSize || 0,
          duration: data.duration || null,
          filename: data.filename || `${doc.id}.file`,
          createdAt: data.createdAt,
        })
      })
    }

    console.log(
      `✅ [Product Box Content API] Successfully fetched ${content.length} content items for product box: ${params.id}`,
    )

    return NextResponse.json({
      success: true,
      content: content,
      productBoxId: params.id,
      totalItems: content.length,
    })
  } catch (error) {
    console.error(`❌ [Product Box Content API] Error fetching content for product box ${params.id}:`, error)

    if (error instanceof Error) {
      console.error("❌ [Product Box Content API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        productBoxId: params.id,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to fetch content for product box",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
