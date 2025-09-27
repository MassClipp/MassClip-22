import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting chat fetch request")
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      console.log("[v0] No valid token found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("[v0] Fetching chats for user:", userId)

    // Get user's chat sessions - simplified query without orderBy to avoid index issues
    const chatsRef = adminDb.collection("vex_chats")
    console.log("[v0] Querying Firestore collection: vex_chats")

    const snapshot = await chatsRef.where("userId", "==", userId).limit(50).get()
    console.log("[v0] Found", snapshot.docs.length, "chat documents")

    const chats = snapshot.docs.map((doc) => {
      const data = doc.data()
      console.log("[v0] Processing chat document:", doc.id, "with data keys:", Object.keys(data))

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    console.log("[v0] Returning", chats.length, "processed chats")
    return NextResponse.json({ chats })
  } catch (error) {
    console.error("[v0] Error fetching chats:", error)
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = decodedToken.uid
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
