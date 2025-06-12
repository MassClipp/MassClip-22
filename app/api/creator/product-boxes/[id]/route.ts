import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Product Box API] Fetching product box: ${productBoxId}`)

    const doc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = {
      id: doc.id,
      ...doc.data(),
    }

    console.log(`✅ [Product Box API] Found product box: ${productBoxId}`)

    return NextResponse.json({
      success: true,
      productBox,
    })
  } catch (error) {
    console.error("❌ [Product Box API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    const body = await request.json()

    console.log(`🔍 [Product Box API] Updating product box: ${productBoxId}`)

    const docRef = db.collection("productBoxes").doc(productBoxId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    await docRef.update(updateData)

    const updatedDoc = await docRef.get()
    const updatedProductBox = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    }

    console.log(`✅ [Product Box API] Updated product box: ${productBoxId}`)

    return NextResponse.json({
      success: true,
      productBox: updatedProductBox,
    })
  } catch (error) {
    console.error("❌ [Product Box API] Error updating:", error)
    return NextResponse.json(
      {
        error: "Failed to update product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    const body = await request.json()

    console.log(`🔍 [Product Box API] Patching product box: ${productBoxId}`, body)

    const docRef = db.collection("productBoxes").doc(productBoxId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    // Only update the fields that are provided
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (body.customPreviewThumbnail !== undefined) {
      updateData.customPreviewThumbnail = body.customPreviewThumbnail
    }

    if (body.customPreviewDescription !== undefined) {
      updateData.customPreviewDescription = body.customPreviewDescription
    }

    // Add any other fields that might be provided
    Object.keys(body).forEach((key) => {
      if (key !== "customPreviewThumbnail" && key !== "customPreviewDescription") {
        updateData[key] = body[key]
      }
    })

    await docRef.update(updateData)

    const updatedDoc = await docRef.get()
    const updatedProductBox = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    }

    console.log(`✅ [Product Box API] Patched product box: ${productBoxId}`)

    return NextResponse.json({
      success: true,
      productBox: updatedProductBox,
    })
  } catch (error) {
    console.error("❌ [Product Box API] Error patching:", error)
    return NextResponse.json(
      {
        error: "Failed to update product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Product Box API] Deleting product box: ${productBoxId}`)

    const docRef = db.collection("productBoxes").doc(productBoxId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    await docRef.delete()

    console.log(`✅ [Product Box API] Deleted product box: ${productBoxId}`)

    return NextResponse.json({
      success: true,
      message: "Product box deleted successfully",
    })
  } catch (error) {
    console.error("❌ [Product Box API] Error deleting:", error)
    return NextResponse.json(
      {
        error: "Failed to delete product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
