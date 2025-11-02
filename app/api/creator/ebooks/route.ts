import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const ebooksSnapshot = await adminDb
      .collection("ebooks")
      .where("creatorId", "==", uid)
      .orderBy("createdAt", "desc")
      .get()

    const ebooks = ebooksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ ebooks })
  } catch (error) {
    console.error("Error fetching eBooks:", error)
    return NextResponse.json({ error: "Failed to fetch eBooks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const { title, description, pageCount } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const ebookData = {
      creatorId: uid,
      title,
      description: description || "",
      coverUrl: "",
      pageCount: pageCount || 0,
      pages: [],
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const ebookRef = await adminDb.collection("ebooks").add(ebookData)

    return NextResponse.json({
      ebookId: ebookRef.id,
      message: "eBook created successfully",
    })
  } catch (error) {
    console.error("Error creating eBook:", error)
    return NextResponse.json({ error: "Failed to create eBook" }, { status: 500 })
  }
}
