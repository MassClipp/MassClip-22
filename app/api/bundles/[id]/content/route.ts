import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

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

const auth = getAuth()
const db = getFirestore()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Get the authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      console.error("Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid
    console.log("User UID from Firebase token:", userUid)
    console.log("Checking access for bundle:", bundleId)

    // First, get bundle info
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    console.log("Bundle data:", bundleData)

    // Check if user has purchased this bundle - try multiple query patterns
    let hasAccess = false
    let purchaseInfo = null
    let bundleContents = []

    // Method 1: Check if user is the creator
    if (bundleData?.creatorId === userUid || bundleData?.creatorUid === userUid) {
      console.log("User is the bundle creator, granting access")
      hasAccess = true
    }

    // Method 2: Check bundlePurchases collection by document ID
    if (!hasAccess) {
      try {
        const purchaseDocId = `${userUid}_${bundleId}`
        const purchaseDoc = await db.collection("bundlePurchases").doc(purchaseDocId).get()

        if (purchaseDoc.exists) {
          console.log("Found purchase by document ID:", purchaseDocId)
          hasAccess = true
          purchaseInfo = purchaseDoc.data()

          // Get content from purchase document
          if (purchaseInfo?.content && Array.isArray(purchaseInfo.content)) {
            bundleContents = purchaseInfo.content
          }
        }
      } catch (error) {
        console.error("Error checking purchase by doc ID:", error)
      }
    }

    // Method 3: Query bundlePurchases by fields
    if (!hasAccess) {
      try {
        const queryFields = ["buyerUid", "userId", "buyerId", "userUid"]

        for (const field of queryFields) {
          if (hasAccess) break

          console.log(`Checking purchases with ${field} = ${userUid} and bundleId = ${bundleId}`)

          const purchasesQuery = await db
            .collection("bundlePurchases")
            .where(field, "==", userUid)
            .where("bundleId", "==", bundleId)
            .limit(1)
            .get()

          if (!purchasesQuery.empty) {
            console.log(`Found purchase using field ${field}`)
            hasAccess = true
            const purchaseDoc = purchasesQuery.docs[0]
            purchaseInfo = {
              purchaseId: purchaseDoc.id,
              ...purchaseDoc.data(),
            }

            // Get content from purchase document
            if (purchaseInfo?.content && Array.isArray(purchaseInfo.content)) {
              bundleContents = purchaseInfo.content
            }
            break
          }
        }
      } catch (error) {
        console.error("Error querying bundlePurchases:", error)
      }
    }

    // Method 4: Check alternative purchases collection
    if (!hasAccess) {
      try {
        const altPurchasesQuery = await db
          .collection("purchases")
          .where("buyerUid", "==", userUid)
          .where("bundleId", "==", bundleId)
          .limit(1)
          .get()

        if (!altPurchasesQuery.empty) {
          console.log("Found purchase in alternative collection")
          hasAccess = true
          const purchaseDoc = altPurchasesQuery.docs[0]
          purchaseInfo = {
            purchaseId: purchaseDoc.id,
            ...purchaseDoc.data(),
          }

          // Get content from purchase document
          if (purchaseInfo?.content && Array.isArray(purchaseInfo.content)) {
            bundleContents = purchaseInfo.content
          }
        }
      } catch (error) {
        console.error("Error checking alternative purchases:", error)
      }
    }

    if (!hasAccess) {
      console.log("No valid purchase found for user:", userUid, "bundle:", bundleId)
      return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
    }

    console.log("Access granted! Found contents:", bundleContents.length)

    // Return bundle info and contents
    return NextResponse.json({
      hasAccess: true,
      bundle: {
        id: bundleId,
        title: bundleData?.title || "Untitled Bundle",
        description: bundleData?.description || "",
        creatorId: bundleData?.creatorId || bundleData?.creatorUid,
        creatorUsername: bundleData?.creatorUsername || "Unknown Creator",
        thumbnailUrl: bundleData?.thumbnailUrl || "",
        price: bundleData?.price || 0,
        currency: bundleData?.currency || "usd",
      },
      contents: bundleContents,
      purchaseInfo: purchaseInfo,
    })
  } catch (error) {
    console.error("Bundle content API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
