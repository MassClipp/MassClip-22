import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const ebookDoc = await adminDb.collection("ebooks").doc(params.id).get()

    if (!ebookDoc.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const ebookData = ebookDoc.data()
    if (ebookData?.creatorId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const serializedData = {
      id: ebookDoc.id,
      ...ebookData,
      createdAt: ebookData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: ebookData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json({ ebook: serializedData })
  } catch (error) {
    console.error("Error fetching eBook:", error)
    return NextResponse.json({ error: "Failed to fetch eBook" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const ebookDoc = await adminDb.collection("ebooks").doc(params.id).get()

    if (!ebookDoc.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const ebookData = ebookDoc.data()
    if (ebookData?.creatorId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updates = await request.json()

    await adminDb
      .collection("ebooks")
      .doc(params.id)
      .update({
        ...updates,
        updatedAt: new Date(),
      })

    return NextResponse.json({ message: "eBook updated successfully" })
  } catch (error) {
    console.error("Error updating eBook:", error)
    return NextResponse.json({ error: "Failed to update eBook" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const ebookDoc = await adminDb.collection("ebooks").doc(params.id).get()

    if (!ebookDoc.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const ebookData = ebookDoc.data()
    if (ebookData?.creatorId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await adminDb.collection("ebooks").doc(params.id).delete()

    return NextResponse.json({ message: "eBook deleted successfully" })
  } catch (error) {
    console.error("Error deleting eBook:", error)
    return NextResponse.json({ error: "Failed to delete eBook" }, { status: 500 })
  }
}
