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

    // Try to find and remove the purchase from multiple possible collections
    const collections = ["purchases", "unified_purchases", "user_purchases"]
    let removed = false

    for (const collectionName of collections) {
      try {
        // Try direct document deletion
        const directDocRef = db.collection(collectionName).doc(purchaseId)
        const directDoc = await directDocRef.get()

        if (directDoc.exists) {
          const data = directDoc.data()
          if (data?.userId === userId || data?.uid === userId) {
            await directDocRef.delete()
            console.log(`✅ [Remove Purchase] Removed from ${collectionName} (direct)`)
            removed = true
          }
        }

        // Try querying by productBoxId (in case purchaseId is actually productBoxId)
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
          removed = true
        }

        // Try querying by sessionId
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
          removed = true
        }
      } catch (error) {
        console.warn(`⚠️ [Remove Purchase] Error with ${collectionName}:`, error)
      }
    }

    // Also try to remove from user's subcollection
    try {
      const userPurchasesRef = db.collection("users").doc(userId).collection("purchases")

      // Try direct deletion
      const directUserDoc = await userPurchasesRef.doc(purchaseId).get()
      if (directUserDoc.exists) {
        await userPurchasesRef.doc(purchaseId).delete()
        console.log(`✅ [Remove Purchase] Removed from user subcollection (direct)`)
        removed = true
      }

      // Try querying by productBoxId
      const userQueryByProductBox = await userPurchasesRef.where("productBoxId", "==", purchaseId).get()

      if (!userQueryByProductBox.empty) {
        const batch = db.batch()
        userQueryByProductBox.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`✅ [Remove Purchase] Removed ${userQueryByProductBox.size} docs from user subcollection`)
        removed = true
      }
    } catch (error) {
      console.warn(`⚠️ [Remove Purchase] Error with user subcollection:`, error)
    }

    if (removed) {
      return NextResponse.json({
        success: true,
        message: "Purchase removed successfully",
      })
    } else {
      return NextResponse.json(
        {
          error: "Purchase not found or already removed",
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
