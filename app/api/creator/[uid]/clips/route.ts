import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  const { uid } = params

  try {
    // Fetch all clips by this creator
    const clipsSnapshot = await db
      .collection("clips")
      .where("creatorId", "==", uid)
      .where("isPublished", "==", true)
      .get()

    const clips = clipsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      }
    })

    return NextResponse.json({ clips })
  } catch (error) {
    console.error("Error fetching creator clips:", error)
    return NextResponse.json({ error: "Failed to fetch creator clips" }, { status: 500 })
  }
}
