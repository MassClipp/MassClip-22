import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get("Authorization")
    let userId = ""

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]
      try {
        const decodedToken = await auth.verifyIdToken(token)
        userId = decodedToken.uid
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    } else {
      // Try to get the session cookie
      const sessionCookie = request.cookies.get("__session")?.value

      if (sessionCookie) {
        try {
          const decodedCookie = await auth.verifySessionCookie(sessionCookie)
          userId = decodedCookie.uid
        } catch (error) {
          return NextResponse.json({ error: "Invalid session" }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
    }

    // Get the user's purchased clips
    const purchasedSnapshot = await db.collection("users").doc(userId).collection("purchasedClips").get()

    const purchasedClipIds = purchasedSnapshot.docs.map((doc) => doc.id)

    // If no purchased clips, return empty array
    if (purchasedClipIds.length === 0) {
      return NextResponse.json({ clips: [] })
    }

    // Fetch the actual clip data
    // Note: Firestore "in" queries are limited to 10 items, so we may need to batch
    const batchSize = 10
    const batches = []

    for (let i = 0; i < purchasedClipIds.length; i += batchSize) {
      const batch = purchasedClipIds.slice(i, i + batchSize)
      batches.push(batch)
    }

    // Execute each batch query
    const clipPromises = batches.map((batch) => db.collection("clips").where("id", "in", batch).get())

    const snapshots = await Promise.all(clipPromises)

    // Combine results
    const clips = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isPurchased: true,
      })),
    )

    return NextResponse.json({ clips })
  } catch (error) {
    console.error("Error fetching purchased clips:", error)
    return NextResponse.json({ error: "Failed to fetch purchased clips" }, { status: 500 })
  }
}
