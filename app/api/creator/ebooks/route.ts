import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ebooksRef = adminDb.collection("ebooks")
    const snapshot = await ebooksRef.where("creatorId", "==", userId).orderBy("createdAt", "desc").get()

    const ebooks = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    return NextResponse.json({ ebooks })
  } catch (error) {
    console.error("Error fetching eBooks:", error)
    return NextResponse.json({ error: "Failed to fetch eBooks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, coverImage, pages, price } = body

    const ebookData = {
      title,
      description,
      coverImage,
      pages: pages || [],
      price: price || 0,
      creatorId: userId,
      published: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await adminDb.collection("ebooks").add(ebookData)

    return NextResponse.json({
      ebook: {
        id: docRef.id,
        ...ebookData,
        createdAt: ebookData.createdAt.toISOString(),
        updatedAt: ebookData.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error creating eBook:", error)
    return NextResponse.json({ error: "Failed to create eBook" }, { status: 500 })
  }
}
