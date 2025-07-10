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
    console.log(`🗑️ [Delete Purchase] Starting deletion for ID: ${purchaseId}`)

    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`👤 [Delete Purchase] User: ${userId}`)

    let deletedCount = 0
    const deletedFrom: string[] = []

    // 1. Delete from user's purchases subcollection
    try {
      const userPurchasesRef = db.collection("users").doc(userId).collection("purchases")

      // Try multiple query approaches
      const queries = [
        userPurchasesRef.where("productBoxId", "==", purchaseId),
        userPurchasesRef.where("bundleId", "==", purchaseId),
        userPurchasesRef.where("itemId", "==", purchaseId),
        userPurchasesRef.where("sessionId", "==", purchaseId),
      ]

      for (const query of queries) {
        const snapshot = await query.get()
        for (const doc of snapshot.docs) {
          await doc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted from user purchases: ${doc.id}`)
        }
      }

      // Also try direct document deletion
      try {
        const directDoc = await userPurchasesRef.doc(purchaseId).get()
        if (directDoc.exists) {
          await directDoc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted direct user purchase: ${purchaseId}`)
        }
      } catch (directError) {
        console.warn(`⚠️ [Delete Purchase] Direct deletion failed:`, directError)
      }

      if (deletedCount > 0) {
        deletedFrom.push("user-purchases")
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from user purchases:`, error)
    }

    // 2. Delete from main purchases collection
    try {
      const mainPurchasesRef = db.collection("purchases")
      const mainQueries = [
        mainPurchasesRef.where("userId", "==", userId).where("productBoxId", "==", purchaseId),
        mainPurchasesRef.where("userId", "==", userId).where("bundleId", "==", purchaseId),
        mainPurchasesRef.where("userId", "==", userId).where("sessionId", "==", purchaseId),
      ]

      for (const query of mainQueries) {
        const snapshot = await query.get()
        for (const doc of snapshot.docs) {
          await doc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted from main purchases: ${doc.id}`)
        }
      }

      if (deletedCount > 0) {
        deletedFrom.push("main-purchases")
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from main purchases:`, error)
    }

    // 3. Delete from UserPurchases collection
    try {
      const userPurchasesCollectionRef = db.collection("UserPurchases")
      const userPurchaseQueries = [
        userPurchasesCollectionRef.where("userId", "==", userId).where("productBoxId", "==", purchaseId),
        userPurchasesCollectionRef.where("userId", "==", userId).where("bundleId", "==", purchaseId),
      ]

      for (const query of userPurchaseQueries) {
        const snapshot = await query.get()
        for (const doc of snapshot.docs) {
          await doc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted from UserPurchases: ${doc.id}`)
        }
      }

      if (deletedCount > 0) {
        deletedFrom.push("UserPurchases")
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from UserPurchases:`, error)
    }

    // 4. Delete from CompletedPurchases collection
    try {
      const completedPurchasesRef = db.collection("CompletedPurchases")
      const completedQueries = [
        completedPurchasesRef.where("userId", "==", userId).where("productBoxId", "==", purchaseId),
        completedPurchasesRef.where("userId", "==", userId).where("bundleId", "==", purchaseId),
      ]

      for (const query of completedQueries) {
        const snapshot = await query.get()
        for (const doc of snapshot.docs) {
          await doc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted from CompletedPurchases: ${doc.id}`)
        }
      }

      if (deletedCount > 0) {
        deletedFrom.push("CompletedPurchases")
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting from CompletedPurchases:`, error)
    }

    // 5. Delete Stripe sessions
    try {
      const stripeSessionsRef = db.collection("stripe-sessions")
      const sessionQueries = [
        stripeSessionsRef.where("userId", "==", userId).where("productBoxId", "==", purchaseId),
        stripeSessionsRef.where("userId", "==", userId).where("bundleId", "==", purchaseId),
      ]

      for (const query of sessionQueries) {
        const snapshot = await query.get()
        for (const doc of snapshot.docs) {
          await doc.ref.delete()
          deletedCount++
          console.log(`✅ [Delete Purchase] Deleted Stripe session: ${doc.id}`)
        }
      }

      if (deletedCount > 0) {
        deletedFrom.push("stripe-sessions")
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error deleting Stripe sessions:`, error)
    }

    // 6. Use collectionGroup to find any nested purchases
    try {
      const collectionGroupQuery = db
        .collectionGroup("purchases")
        .where("userId", "==", userId)
        .where("productBoxId", "==", purchaseId)

      const groupSnapshot = await collectionGroupQuery.get()
      for (const doc of groupSnapshot.docs) {
        await doc.ref.delete()
        deletedCount++
        console.log(`✅ [Delete Purchase] Deleted from collection group: ${doc.ref.path}`)
      }

      if (groupSnapshot.docs.length > 0) {
        deletedFrom.push("collection-group")
      }
    } catch (error) {
      console.warn(`⚠️ [Delete Purchase] Error with collection group:`, error)
    }

    console.log(`🎯 [Delete Purchase] Total deleted: ${deletedCount} records from: ${deletedFrom.join(", ")}`)

    if (deletedCount === 0) {
      return NextResponse.json(
        {
          error: "Purchase not found",
          message: `No purchase found with ID: ${purchaseId}`,
          searchedCollections: [
            "user-purchases",
            "main-purchases",
            "UserPurchases",
            "CompletedPurchases",
            "stripe-sessions",
          ],
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} purchase record(s)`,
      deletedCount,
      deletedFrom,
      purchaseId,
    })
  } catch (error) {
    console.error("❌ [Delete Purchase] Error:", error)
    return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 })
  }
}
