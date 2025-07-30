import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// Add these helper functions before the main GET function
async function getPurchaseBySession(sessionId: string) {
  try {
    const allPurchases: any[] = []

    // Check all purchase collections for this session
    const collections = ["bundlePurchases", "unifiedPurchases", "purchases"]

    for (const collectionName of collections) {
      try {
        const doc = await db.collection(collectionName).doc(sessionId).get()
        if (doc.exists) {
          const data = doc.data()!
          allPurchases.push({
            ...data,
            id: doc.id,
            source: collectionName,
          })
        }
      } catch (error) {
        console.warn(`⚠️ [Session Lookup] Error checking ${collectionName}:`, error)
      }
    }

    console.log(`✅ [Session Lookup] Found ${allPurchases.length} purchases for session ${sessionId}`)

    return NextResponse.json({
      purchases: allPurchases,
      totalCount: allPurchases.length,
      sessionId,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ [Session Lookup] Error:`, error)
    return NextResponse.json({ error: "Failed to fetch purchase", details: error.message }, { status: 500 })
  }
}

async function getPurchasesByEmail(email: string) {
  try {
    const allPurchases: any[] = []

    // Check all purchase collections for this email
    const collections = ["bundlePurchases", "unifiedPurchases", "purchases"]

    for (const collectionName of collections) {
      try {
        const query = db.collection(collectionName).where("customerEmail", "==", email)
        const snapshot = await query.get()

        snapshot.forEach((doc) => {
          allPurchases.push({
            ...doc.data(),
            id: doc.id,
            source: collectionName,
          })
        })
      } catch (error) {
        console.warn(`⚠️ [Email Lookup] Error checking ${collectionName}:`, error)
      }
    }

    console.log(`✅ [Email Lookup] Found ${allPurchases.length} purchases for email ${email}`)

    return NextResponse.json({
      purchases: allPurchases,
      totalCount: allPurchases.length,
      email,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ [Email Lookup] Error:`, error)
    return NextResponse.json({ error: "Failed to fetch purchases", details: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const email = searchParams.get("email")

    console.log("[Unified Purchases] Request params:", {
      userId: session?.user?.id,
      sessionId,
      email,
      hasSession: !!session,
    })

    let purchases: any[] = []

    // If user is authenticated, get their purchases
    if (session?.user?.id) {
      console.log("[Unified Purchases] Fetching authenticated user purchases")

      // Get from unified purchases
      const unifiedQuery = await db
        .collection("unifiedPurchases")
        .where("userId", "==", session.user.id)
        .orderBy("createdAt", "desc")
        .get()

      purchases = unifiedQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      }))

      // Also check user's purchases subcollection
      const userPurchasesQuery = await db
        .collection("users")
        .doc(session.user.id)
        .collection("purchases")
        .orderBy("createdAt", "desc")
        .get()

      const userPurchases = userPurchasesQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      }))

      // Merge and deduplicate
      const allPurchases = [...purchases, ...userPurchases]
      const uniquePurchases = allPurchases.filter(
        (purchase, index, self) => index === self.findIndex((p) => p.sessionId === purchase.sessionId),
      )

      purchases = uniquePurchases
    }

    // If no authenticated purchases and we have session ID or email, check anonymous purchases
    if (purchases.length === 0 && (sessionId || email)) {
      console.log("[Unified Purchases] Fetching anonymous purchases")

      let query = db.collection("unifiedPurchases")

      if (sessionId) {
        query = query.where("sessionId", "==", sessionId)
      } else if (email) {
        query = query.where("customerEmail", "==", email)
      }

      const anonymousQuery = await query.orderBy("createdAt", "desc").get()

      purchases = anonymousQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      }))
    }

    console.log("[Unified Purchases] Found purchases:", purchases.length)

    return NextResponse.json({
      success: true,
      purchases,
    })
  } catch (error) {
    console.error("[Unified Purchases] Error:", error)
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 })
  }
}
