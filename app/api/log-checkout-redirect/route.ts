import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Checkout redirect log:", JSON.stringify(body, null, 2))

    // Try to log to Firestore
    try {
      const { getFirestore } = await import("firebase-admin/firestore")
      const { initializeFirebaseAdmin } = await import("@/lib/firebase-admin")

      initializeFirebaseAdmin()
      const db = getFirestore()

      await db.collection("stripeRedirectLogs").add({
        ...body,
        timestamp: new Date(),
      })
    } catch (dbError) {
      console.error("Error logging to Firestore:", dbError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging checkout redirect:", error)
    return NextResponse.json({ error: "Failed to log redirect" }, { status: 500 })
  }
}
