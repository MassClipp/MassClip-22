import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  const { uid } = params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // "free", "paid", or null for all

  try {
    let query = db.collection("clips").where("creatorId", "==", uid)

    if (type === "free") {
      query = query.where("isPaid", "==", false)
    } else if (type === "paid") {
      query = query.where("isPaid", "==", true)
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(20).get()

    const clips = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      }
    })

    return NextResponse.json({ clips })
  } catch (error) {
    console.error("Error fetching creator clips:", error)
    return NextResponse.json({ error: "Failed to fetch creator clips" }, { status: 500 })
  }
}
