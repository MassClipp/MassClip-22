import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

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
const auth = getAuth()

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const purchaseId = params.id
    const authHeader = request.headers.get("Authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🗑️ [Delete Purchase] Removing purchase ${purchaseId} for user ${userId}`)

    // Collections to check for purchases
    const collections = [
      "purchases",
      "unifiedPurchases",
      "productBoxPurchases",
      "bundlePurchases",
      "user_purchases",
      "stripe_purchases",
    ]

    let deletedCount = 0

    // Try to delete from all possible collections
    for (const collectionName of collections) {
      try {
        // Try direct document deletion
        const directDocRef = db.collection(collectionName).doc(purchaseId)
        const directDoc = await directDocRef.get()

        if (directDoc.exists) {
          const data = directDoc.data()
          if (data?.userId === userId || data?.uid === userId) {
            await directDocRef.delete()
            deletedCount++
            console.log(`✅ [Delete Purchase] Deleted from ${collectionName} (direct)`)
          }
        }

        // Try query-based deletion
        const queryRef = db
          .collection(collectionName)
          .where("userId", "==", userId)
          .where("productBoxId", "==", purchaseId)

        const querySnapshot = await queryRef.get()

        for (const doc of querySnapshot.docs) {
          await doc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted from ${collectionName} (query)`)
        }

        // Try alternative query patterns
        const altQueries = [
          db.collection(collectionName).where("uid", "==", userId).where("bundleId", "==", purchaseId),
          db.collection(collectionName).where("userId", "==", userId).where("itemId", "==", purchaseId),
          db.collection(collectionName).where("userId", "==", userId).where("id", "==", purchaseId),
        ]

        for (const altQuery of altQueries) {
          try {
            const altSnapshot = await altQuery.get()
            for (const doc of altSnapshot.docs) {
              await doc.ref.delete()
              deletedCount++
              console.log(`✅ [Delete Purchase] Deleted from ${collectionName} (alt query)`)
            }
          } catch (altError) {
            // Ignore query errors for non-existent fields
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Delete Purchase] Error with ${collectionName}:`, error)
      }
    }

    // Also try to remove from user's purchase subcollection
    try {
      const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc(purchaseId)
      const userPurchaseDoc = await userPurchaseRef.get()

      if (userPurchaseDoc.exists) {
        await userPurchaseRef.delete()
        deletedCount++
        console.log(`✅ [Delete Purchase] Deleted from user subcollection`)
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error with user subcollection:`, error)
    }

    if (deletedCount > 0) {
      console.log(`✅ [Delete Purchase] Successfully deleted ${deletedCount} purchase records`)
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} purchase records`,
        deletedCount,
      })
    } else {
      console.log(`⚠️ [Delete Purchase] No purchase records found to delete`)
      return NextResponse.json({
        success: true,
        message: "No purchase records found to delete",
      })
    }
  } catch (error: any) {
    console.error(`❌ [Delete Purchase] Error:`, error)
    return NextResponse.json({ error: "Failed to delete purchase", details: error.message }, { status: 500 })
  }
}
