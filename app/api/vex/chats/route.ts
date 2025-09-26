import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.uid

    // Get user's chat sessions
    const chatsRef = adminDb.collection("vex_chats")
    const snapshot = await chatsRef.where("userId", "==", userId).orderBy("updatedAt", "desc").limit(50).get()

    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }))

    return NextResponse.json({ chats })
  } catch (error) {
    console.error("Error fetching chats:", error)
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.uid
    const { title, messages } = await request.json()

    // Create new chat session
    const chatData = {
      userId,
      title: title || "New Chat",
      messages: messages || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await adminDb.collection("vex_chats").add(chatData)

    return NextResponse.json({
      id: docRef.id,
      ...chatData,
      createdAt: chatData.createdAt.toISOString(),
      updatedAt: chatData.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Error creating chat:", error)
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}
