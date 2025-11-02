import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const docRef = adminDb.collection("ebooks").doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const data = doc.data()

    if (data?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      ebook: {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching eBook:", error)
    return NextResponse.json({ error: "Failed to fetch eBook" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const docRef = adminDb.collection("ebooks").doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const data = doc.data()

    if (data?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const updates = {
      ...body,
      updatedAt: new Date(),
    }

    await docRef.update(updates)

    const updatedDoc = await docRef.get()
    const updatedData = updatedDoc.data()

    return NextResponse.json({
      ebook: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error updating eBook:", error)
    return NextResponse.json({ error: "Failed to update eBook" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const docRef = adminDb.collection("ebooks").doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const data = doc.data()

    if (data?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting eBook:", error)
    return NextResponse.json({ error: "Failed to delete eBook" }, { status: 500 })
  }
}
