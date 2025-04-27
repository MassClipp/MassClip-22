import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function GET(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Get the most recent reference records
    const refsSnapshot = await db.collection("stripeReferences").orderBy("createdAt", "desc").limit(20).get()
    const references = refsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({ references })
  } catch (error) {
    console.error("Error fetching reference records:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
