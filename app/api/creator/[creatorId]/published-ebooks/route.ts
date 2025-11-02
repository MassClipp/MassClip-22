import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const ebooksRef = adminDb.collection("ebooks")
    const snapshot = await ebooksRef
      .where("creatorId", "==", params.creatorId)
      .where("published", "==", true)
      .orderBy("createdAt", "desc")
      .get()

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
    console.error("Error fetching published eBooks:", error)
    return NextResponse.json({ error: "Failed to fetch published eBooks" }, { status: 500 })
  }
}
