import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.uid
    const chatId = params.id

    const doc = await adminDb.collection("vex_chats").doc(chatId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const chatData = doc.data()
    if (chatData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      id: doc.id,
      ...chatData,
      createdAt: chatData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: chatData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching chat:", error)
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.uid
    const chatId = params.id
    const { title, messages } = await request.json()

    const docRef = adminDb.collection("vex_chats").doc(chatId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const chatData = doc.data()
    if (chatData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (title !== undefined) updateData.title = title
    if (messages !== undefined) updateData.messages = messages

    await docRef.update(updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating chat:", error)
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.uid
    const chatId = params.id

    const docRef = adminDb.collection("vex_chats").doc(chatId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const chatData = doc.data()
    if (chatData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting chat:", error)
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
  }
}
