import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid
    const purchaseId = params.id

    console.log(`🗑️ [Delete Purchase] Removing purchase ${purchaseId} for user ${userId}`)

    let deletedCount = 0
    const deletedFrom: string[] = []

    // 1. Delete from user's purchases subcollection
    try {
      const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc(purchaseId)
      const userPurchaseDoc = await userPurchaseRef.get()
      if (userPurchaseDoc.exists) {
        await userPurchaseRef.delete()
        deletedCount++
        deletedFrom.push("users/{userId}/purchases")
        console.log(`✅ [Delete Purchase] Removed from users/${userId}/purchases`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from user purchases:`, error)
    }

    // 2. Delete from main purchases collection
    try {
      const mainPurchaseRef = db.collection("purchases").doc(purchaseId)
      const mainPurchaseDoc = await mainPurchaseRef.get()
      if (mainPurchaseDoc.exists) {
        await mainPurchaseRef.delete()
        deletedCount++
        deletedFrom.push("purchases")
        console.log(`✅ [Delete Purchase] Removed from purchases collection`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from main purchases:`, error)
    }

    // 3. Search and delete from purchases collection by userId and productBoxId/bundleId
    try {
      const purchasesByUserQuery = await db
        .collection("purchases")
        .where("userId", "==", userId)
        .where("productBoxId", "==", purchaseId)
        .get()

      for (const doc of purchasesByUserQuery.docs) {
        await doc.ref.delete()
        deletedCount++
        deletedFrom.push(`purchases (by productBoxId)`)
        console.log(`✅ [Delete Purchase] Removed purchase ${doc.id} by productBoxId`)
      }

      const purchasesByBundleQuery = await db
        .collection("purchases")
        .where("userId", "==", userId)
        .where("bundleId", "==", purchaseId)
        .get()

      for (const doc of purchasesByBundleQuery.docs) {
        await doc.ref.delete()
        deletedCount++
        deletedFrom.push(`purchases (by bundleId)`)
        console.log(`✅ [Delete Purchase] Removed purchase ${doc.id} by bundleId`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error searching purchases by fields:`, error)
    }

    // 4. Delete from userPurchases collection
    try {
      const userPurchasesQuery = await db
        .collection("userPurchases")
        .where("userId", "==", userId)
        .where("productBoxId", "==", purchaseId)
        .get()

      for (const doc of userPurchasesQuery.docs) {
        await doc.ref.delete()
        deletedCount++
        deletedFrom.push("userPurchases")
        console.log(`✅ [Delete Purchase] Removed from userPurchases`)
      }

      const userPurchasesByBundleQuery = await db
        .collection("userPurchases")
        .where("userId", "==", userId)
        .where("bundleId", "==", purchaseId)
        .get()

      for (const doc of userPurchasesByBundleQuery.docs) {
        await doc.ref.delete()
        deletedCount++
        deletedFrom.push("userPurchases (by bundleId)")
        console.log(`✅ [Delete Purchase] Removed from userPurchases by bundleId`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from userPurchases:`, error)
    }

    // 5. Delete from completedPurchases collection
    try {
      const completedPurchasesQuery = await db
        .collection("completedPurchases")
        .where("userId", "==", userId)
        .where("productBoxId", "==", purchaseId)
        .get()

      for (const doc of completedPurchasesQuery.docs) {
        await doc.ref.delete()
        deletedCount++
        deletedFrom.push("completedPurchases")
        console.log(`✅ [Delete Purchase] Removed from completedPurchases`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from completedPurchases:`, error)
    }

    // 6. Search for and delete any Stripe session records
    try {
      const stripeSessionsQuery = await db
        .collection("stripe_sessions")
        .where("customer_details.email", "==", decodedToken.email)
        .where("metadata.productBoxId", "==", purchaseId)
        .get()

      for (const doc of stripeSessionsQuery.docs) {
        await doc.ref.delete()
        deletedCount++
        deletedFrom.push("stripe_sessions")
        console.log(`✅ [Delete Purchase] Removed Stripe session ${doc.id}`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting Stripe sessions:`, error)
    }

    // 7. Delete from any nested purchase structures
    try {
      const nestedPurchasesQuery = await db.collectionGroup("purchases").where("userId", "==", userId).get()

      for (const doc of nestedPurchasesQuery.docs) {
        const data = doc.data()
        if (
          data.productBoxId === purchaseId ||
          data.bundleId === purchaseId ||
          data.itemId === purchaseId ||
          data.sessionId === purchaseId
        ) {
          await doc.ref.delete()
          deletedCount++
          deletedFrom.push(`nested purchases (${doc.ref.path})`)
          console.log(`✅ [Delete Purchase] Removed nested purchase at ${doc.ref.path}`)
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting nested purchases:`, error)
    }

    console.log(
      `✅ [Delete Purchase] Deletion complete. Removed ${deletedCount} records from: ${deletedFrom.join(", ")}`,
    )

    if (deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Purchase not found",
          deletedCount: 0,
          deletedFrom: [],
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Purchase permanently deleted",
      deletedCount,
      deletedFrom,
    })
  } catch (error: any) {
    console.error("❌ [Delete Purchase] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid
    const purchaseId = params.id

    console.log(`🔍 [Get Purchase] Fetching purchase ${purchaseId} for user ${userId}`)

    // Check user's purchases subcollection first
    const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc(purchaseId)
    const userPurchaseDoc = await userPurchaseRef.get()

    if (userPurchaseDoc.exists) {
      return NextResponse.json({
        id: userPurchaseDoc.id,
        ...userPurchaseDoc.data(),
      })
    }

    // Check main purchases collection
    const mainPurchaseRef = db.collection("purchases").doc(purchaseId)
    const mainPurchaseDoc = await mainPurchaseRef.get()

    if (mainPurchaseDoc.exists) {
      const data = mainPurchaseDoc.data()
      if (data?.userId === userId) {
        return NextResponse.json({
          id: mainPurchaseDoc.id,
          ...data,
        })
      }
    }

    return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
  } catch (error: any) {
    console.error("❌ [Get Purchase] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
