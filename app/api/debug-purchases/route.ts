import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getUserIdFromParams(request: NextRequest): Promise<string | null> {
  const searchParams = request.nextUrl.searchParams
  return searchParams.get("userId")
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromParams(request)

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    console.log("🔍 [Debug Purchases] Checking for user:", userId)

    // Check all collections
    const results = {
      mainPurchases: [],
      userPurchases: [],
      unifiedPurchases: [],
      userDocument: null,
    }

    // Check main purchases collection
    try {
      const mainSnapshot = await db.collection("purchases").get()
      console.log(`📊 [Debug] Main purchases collection has ${mainSnapshot.size} documents`)

      mainSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.userId === userId || data.buyerUid === userId) {
          results.mainPurchases.push({ id: doc.id, ...data })
        }
      })
    } catch (error) {
      console.error("Error checking main purchases:", error)
    }

    // Check user subcollection
    try {
      const userSnapshot = await db.collection("users").doc(userId).collection("purchases").get()
      console.log(`📊 [Debug] User subcollection has ${userSnapshot.size} documents`)

      userSnapshot.forEach((doc) => {
        results.userPurchases.push({ id: doc.id, ...doc.data() })
      })
    } catch (error) {
      console.error("Error checking user purchases:", error)
    }

    // Check unified purchases
    try {
      const unifiedSnapshot = await db.collection("userPurchases").doc(userId).collection("purchases").get()
      console.log(`📊 [Debug] Unified purchases has ${unifiedSnapshot.size} documents`)

      unifiedSnapshot.forEach((doc) => {
        results.unifiedPurchases.push({ id: doc.id, ...doc.data() })
      })
    } catch (error) {
      console.error("Error checking unified purchases:", error)
    }

    // Check user document
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      if (userDoc.exists) {
        results.userDocument = userDoc.data()
      }
    } catch (error) {
      console.error("Error checking user document:", error)
    }

    console.log("🔍 [Debug Purchases] Results:", results)

    return NextResponse.json(results)
  } catch (error) {
    console.error("❌ [Debug Purchases] Error:", error)
    return NextResponse.json({ error: "Failed to debug purchases" }, { status: 500 })
  }
}
