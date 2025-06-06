import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Product Box Content API] Adding content to product box: ${params.id}`)

    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Product Box Content API] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    if (existingData?.creatorId !== session.uid) {
      console.log(`❌ [Product Box Content API] Access denied for user ${session.uid} to product box ${params.id}`)
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
        if (uploadData?.uid !== session.uid) {
          console.log(`❌ [Product Box Content API] Upload ${uploadId} does not belong to user ${session.uid}`)
          return NextResponse.json({ error: `Access denied to upload ${uploadId}` }, { status: 403 })
        }
      } catch (uploadError) {
        console.error(`❌ [Product Box Content API] Error validating upload ${uploadId}:`, uploadError)
        return NextResponse.json({ error: `Failed to validate upload ${uploadId}` }, { status: 500 })
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

    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Product Box Content API] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    if (existingData?.creatorId !== session.uid) {
      console.log(`❌ [Product Box Content API] Access denied for user ${session.uid} to product box ${params.id}`)
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
