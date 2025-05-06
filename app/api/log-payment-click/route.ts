import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Parse the request body
    const body = await request.json()
    const { userId, email, timestamp, paymentLink } = body

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log the payment click to Firestore
    await db.collection("paymentLinkClicks").add({
      userId,
      email,
      timestamp: timestamp || new Date().toISOString(),
      paymentLink,
      source: request.headers.get("referer") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging payment click:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
