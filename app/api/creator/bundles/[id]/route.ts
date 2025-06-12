import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle API] Fetching bundle: ${bundleId}`)

    const doc = await db.collection("bundles").doc(bundleId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundle = {
      id: doc.id,
      ...doc.data(),
    }

    console.log(`✅ [Bundle API] Found bundle: ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundle,
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    const body = await request.json()

    console.log(`🔍 [Bundle API] Updating bundle: ${bundleId}`)

    const docRef = db.collection("bundles").doc(bundleId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    await docRef.update(updateData)

    const updatedDoc = await docRef.get()
    const updatedBundle = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    }

    console.log(`✅ [Bundle API] Updated bundle: ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundle: updatedBundle,
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error updating:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    const body = await request.json()

    console.log(`🔍 [Bundle API] Patching bundle: ${bundleId}`, body)

    const docRef = db.collection("bundles").doc(bundleId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
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
    const updatedBundle = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    }

    console.log(`✅ [Bundle API] Patched bundle: ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundle: updatedBundle,
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error patching:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle API] Deleting bundle: ${bundleId}`)

    const docRef = db.collection("bundles").doc(bundleId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    await docRef.delete()

    console.log(`✅ [Bundle API] Deleted bundle: ${bundleId}`)

    return NextResponse.json({
      success: true,
      message: "Bundle deleted successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error deleting:", error)
    return NextResponse.json(
      {
        error: "Failed to delete bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
