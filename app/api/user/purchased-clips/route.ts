import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("__session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session
    let userId
    try {
      const decodedCookie = await auth.verifySessionCookie(sessionCookie)
      userId = decodedCookie.uid
    } catch (error) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get the user's purchased clips
    const purchasedClipsSnapshot = await db.collection("users").doc(userId).collection("purchasedClips").get()

    if (purchasedClipsSnapshot.empty) {
      return NextResponse.json({ clips: [] })
    }

    // Get clip IDs
    const clipIds = purchasedClipsSnapshot.docs.map((doc) => doc.data().clipId)

    // Get clip details
    const clipsPromises = clipIds.map(async (clipId) => {
      const clipDoc = await db.collection("clips").doc(clipId).get()

      if (!clipDoc.exists) {
        return null
      }

      const clipData = clipDoc.data()

      // Get creator info
      const creatorDoc = await db.collection("users").doc(clipData.creatorId).get()
      const creatorName = creatorDoc.exists ? creatorDoc.data()?.displayName : "Unknown Creator"

      // Get purchase info
      const purchaseData = purchasedClipsSnapshot.docs.find((doc) => doc.data().clipId === clipId)?.data()

      return {
        id: clipId,
        ...clipData,
        creatorName,
        purchasedAt: purchaseData?.purchasedAt?.toDate(),
      }
    })

    const clips = (await Promise.all(clipsPromises)).filter(Boolean)

    return NextResponse.json({ clips })
  } catch (error) {
    console.error("Error fetching purchased clips:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch purchased clips" },
      { status: 500 },
    )
  }
}
