import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-server"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 Fetching anonymous purchases for session:", sessionId)

    // Query purchases by session ID
    const purchasesRef = collection(db, "purchases")
    const purchasesQuery = query(purchasesRef, where("sessionId", "==", sessionId), orderBy("purchaseDate", "desc"))

    const purchasesSnap = await getDocs(purchasesQuery)
    const purchases: any[] = []

    purchasesSnap.forEach((doc) => {
      const data = doc.data()
      purchases.push({
        id: doc.id,
        ...data,
      })
    })

    console.log(`📦 Found ${purchases.length} anonymous purchases`)

    return NextResponse.json({
      success: true,
      purchases,
    })
  } catch (error) {
    console.error("❌ Error fetching anonymous purchases:", error)
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 })
  }
}
