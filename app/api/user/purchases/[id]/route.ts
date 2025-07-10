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

    console.log(`🗑️ [Remove Purchase] User ${userId} removing purchase ${purchaseId}`)

    let totalRemoved = 0

    // 1. Remove from main collections
    const mainCollections = [
      "purchases",
      "unified_purchases",
      "user_purchases",
      "productBoxPurchases",
      "bundlePurchases",
    ]

    for (const collectionName of mainCollections) {
      try {
        // Try direct document deletion by purchaseId
        const directDocRef = db.collection(collectionName).doc(purchaseId)
        const directDoc = await directDocRef.get()

        if (directDoc.exists) {
          const data = directDoc.data()
          if (data?.userId === userId || data?.uid === userId) {
            await directDocRef.delete()
            console.log(`✅ [Remove Purchase] Removed from ${collectionName} (direct by ID)`)
            totalRemoved++
          }
        }

        // Query by userId and productBoxId
        const queryByProductBox = await db
          .collection(collectionName)
          .where("userId", "==", userId)
          .where("productBoxId", "==", purchaseId)
          .get()

        if (!queryByProductBox.empty) {
          const batch = db.batch()
          queryByProductBox.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(
            `✅ [Remove Purchase] Removed ${queryByProductBox.size} docs from ${collectionName} (by productBoxId)`,
          )
          totalRemoved += queryByProductBox.size
        }

        // Query by userId and sessionId
        const queryBySession = await db
          .collection(collectionName)
          .where("userId", "==", userId)
          .where("sessionId", "==", purchaseId)
          .get()

        if (!queryBySession.empty) {
          const batch = db.batch()
          queryBySession.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(`✅ [Remove Purchase] Removed ${queryBySession.size} docs from ${collectionName} (by sessionId)`)
          totalRemoved += queryBySession.size
        }

        // Query by userId and bundleId (alternative field name)
        const queryByBundle = await db
          .collection(collectionName)
          .where("userId", "==", userId)
          .where("bundleId", "==", purchaseId)
          .get()

        if (!queryByBundle.empty) {
          const batch = db.batch()
          queryByBundle.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(`✅ [Remove Purchase] Removed ${queryByBundle.size} docs from ${collectionName} (by bundleId)`)
          totalRemoved += queryByBundle.size
        }

        // Query by userId and itemId (another alternative field name)
        const queryByItem = await db
          .collection(collectionName)
          .where("userId", "==", userId)
          .where("itemId", "==", purchaseId)
          .get()

        if (!queryByItem.empty) {
          const batch = db.batch()
          queryByItem.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(`✅ [Remove Purchase] Removed ${queryByItem.size} docs from ${collectionName} (by itemId)`)
          totalRemoved += queryByItem.size
        }
      } catch (error) {
        console.warn(`⚠️ [Remove Purchase] Error with ${collectionName}:`, error)
      }
    }

    // 2. Remove from user's subcollections
    const userSubcollections = ["purchases", "unified_purchases", "bundles", "productBoxes"]

    for (const subcollection of userSubcollections) {
      try {
        const userCollectionRef = db.collection("users").doc(userId).collection(subcollection)

        // Try direct deletion by purchaseId
        const directUserDoc = await userCollectionRef.doc(purchaseId).get()
        if (directUserDoc.exists) {
          await userCollectionRef.doc(purchaseId).delete()
          console.log(`✅ [Remove Purchase] Removed from users/${userId}/${subcollection} (direct)`)
          totalRemoved++
        }

        // Query by productBoxId
        const userQueryByProductBox = await userCollectionRef.where("productBoxId", "==", purchaseId).get()
        if (!userQueryByProductBox.empty) {
          const batch = db.batch()
          userQueryByProductBox.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(
            `✅ [Remove Purchase] Removed ${userQueryByProductBox.size} docs from users/${userId}/${subcollection} (by productBoxId)`,
          )
          totalRemoved += userQueryByProductBox.size
        }

        // Query by sessionId
        const userQueryBySession = await userCollectionRef.where("sessionId", "==", purchaseId).get()
        if (!userQueryBySession.empty) {
          const batch = db.batch()
          userQueryBySession.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(
            `✅ [Remove Purchase] Removed ${userQueryBySession.size} docs from users/${userId}/${subcollection} (by sessionId)`,
          )
          totalRemoved += userQueryBySession.size
        }
      } catch (error) {
        console.warn(`⚠️ [Remove Purchase] Error with user subcollection ${subcollection}:`, error)
      }
    }

    // 3. Remove from userPurchases nested structure
    try {
      const userPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")

      // Try direct deletion
      const directNestedDoc = await userPurchasesRef.doc(purchaseId).get()
      if (directNestedDoc.exists) {
        await userPurchasesRef.doc(purchaseId).delete()
        console.log(`✅ [Remove Purchase] Removed from userPurchases/${userId}/purchases (direct)`)
        totalRemoved++
      }

      // Query by productBoxId
      const nestedQueryByProductBox = await userPurchasesRef.where("productBoxId", "==", purchaseId).get()
      if (!nestedQueryByProductBox.empty) {
        const batch = db.batch()
        nestedQueryByProductBox.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(
          `✅ [Remove Purchase] Removed ${nestedQueryByProductBox.size} docs from userPurchases/${userId}/purchases`,
        )
        totalRemoved += nestedQueryByProductBox.size
      }
    } catch (error) {
      console.warn(`⚠️ [Remove Purchase] Error with userPurchases nested structure:`, error)
    }

    // 4. Also check and remove any Stripe session references
    try {
      const stripeSessionsQuery = await db
        .collection("stripe_sessions")
        .where("customer_details.metadata.userId", "==", userId)
        .where("metadata.productBoxId", "==", purchaseId)
        .get()

      if (!stripeSessionsQuery.empty) {
        const batch = db.batch()
        stripeSessionsQuery.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`✅ [Remove Purchase] Removed ${stripeSessionsQuery.size} Stripe session records`)
        totalRemoved += stripeSessionsQuery.size
      }
    } catch (error) {
      console.warn(`⚠️ [Remove Purchase] Error removing Stripe sessions:`, error)
    }

    console.log(`🎯 [Remove Purchase] Total documents removed: ${totalRemoved}`)

    if (totalRemoved > 0) {
      return NextResponse.json({
        success: true,
        message: `Purchase removed successfully (${totalRemoved} records deleted)`,
        removedCount: totalRemoved,
      })
    } else {
      return NextResponse.json(
        {
          error: "Purchase not found or already removed",
          searchedId: purchaseId,
          userId: userId,
        },
        { status: 404 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Remove Purchase] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to remove purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
