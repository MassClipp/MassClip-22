import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    console.log("🛒 [Unified Purchases] Starting unified purchases fetch...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Unified Purchases] Missing or invalid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.substring(7) // Remove "Bearer " prefix

    // Verify Firebase token - REQUIRED for purchases
    let userId: string
    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log("✅ [Unified Purchases] Token verified for user:", userId)
    } catch (error) {
      console.error("❌ [Unified Purchases] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Fetch user's purchases from their subcollection (fastest method)
    console.log("📦 [Unified Purchases] Fetching user purchases from subcollection...")
    const userPurchasesQuery = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .orderBy("purchasedAt", "desc")
      .get()

    const purchases = []
    const bundleIds = new Set()

    // Process user's purchase records
    for (const doc of userPurchasesQuery.docs) {
      const purchaseData = doc.data()

      console.log("📄 [Unified Purchases] Processing purchase:", {
        id: doc.id,
        bundleId: purchaseData.bundleId,
        status: purchaseData.status,
        purchasedAt: purchaseData.purchasedAt,
      })

      if (purchaseData.bundleId && purchaseData.status === "completed") {
        bundleIds.add(purchaseData.bundleId)

        purchases.push({
          id: doc.id,
          bundleId: purchaseData.bundleId,
          purchaseId: purchaseData.purchaseId,
          sessionId: purchaseData.sessionId,
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          status: purchaseData.status,
          purchasedAt: purchaseData.purchasedAt?.toDate?.() || new Date(),
          bundleTitle: purchaseData.bundleTitle || "Unknown Bundle",
          creatorId: purchaseData.creatorId,
          verified: true, // All purchases in user subcollection are verified
        })
      }
    }

    console.log(`📊 [Unified Purchases] Found ${purchases.length} verified purchases for user ${userId}`)

    // Fetch bundle details for all purchased bundles
    const bundleDetails = {}
    if (bundleIds.size > 0) {
      console.log("📦 [Unified Purchases] Fetching bundle details for", bundleIds.size, "bundles...")

      // Fetch bundles in batches (Firestore limit is 10 for 'in' queries)
      const bundleIdArray = Array.from(bundleIds)
      const batchSize = 10

      for (let i = 0; i < bundleIdArray.length; i += batchSize) {
        const batch = bundleIdArray.slice(i, i + batchSize)
        const bundlesQuery = await db.collection("bundles").where("__name__", "in", batch).get()

        bundlesQuery.forEach((doc) => {
          const bundleData = doc.data()
          bundleDetails[doc.id] = {
            id: doc.id,
            title: bundleData.title || "Untitled Bundle",
            description: bundleData.description || "",
            thumbnailUrl: bundleData.thumbnailUrl || "",
            downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
            fileSize: bundleData.fileSize || 0,
            fileType: bundleData.fileType || "",
            duration: bundleData.duration || 0,
            tags: bundleData.tags || [],
            creatorId: bundleData.creatorId,
            price: bundleData.price || 0,
            uploadedAt: bundleData.uploadedAt || bundleData.createdAt,
          }
        })
      }
    }

    // Fetch creator details for unique creators
    const creatorIds = new Set()
    Object.values(bundleDetails).forEach((bundle: any) => {
      if (bundle.creatorId) {
        creatorIds.add(bundle.creatorId)
      }
    })

    const creatorDetails = {}
    if (creatorIds.size > 0) {
      console.log("👤 [Unified Purchases] Fetching creator details for", creatorIds.size, "creators...")

      const creatorIdArray = Array.from(creatorIds)
      const batchSize = 10

      for (let i = 0; i < creatorIdArray.length; i += batchSize) {
        const batch = creatorIdArray.slice(i, i + batchSize)
        const creatorsQuery = await db.collection("users").where("__name__", "in", batch).get()

        creatorsQuery.forEach((doc) => {
          const creatorData = doc.data()
          creatorDetails[doc.id] = {
            id: doc.id,
            name: creatorData.displayName || creatorData.name || "Unknown Creator",
            username: creatorData.username || "",
            profilePicture: creatorData.profilePicture || "",
          }
        })
      }
    }

    // Combine purchase data with bundle and creator details
    const enrichedPurchases = purchases.map((purchase) => {
      const bundle = bundleDetails[purchase.bundleId] || {}
      const creator = creatorDetails[bundle.creatorId] || {}

      return {
        ...purchase,
        item: {
          id: purchase.bundleId,
          title: bundle.title || purchase.bundleTitle || "Unknown Bundle",
          description: bundle.description || "",
          type: "bundle",
          thumbnailUrl: bundle.thumbnailUrl || "",
          downloadUrl: bundle.downloadUrl || "",
          fileSize: bundle.fileSize || 0,
          fileType: bundle.fileType || "",
          duration: bundle.duration || 0,
          tags: bundle.tags || [],
          price: bundle.price || 0,
          uploadedAt: bundle.uploadedAt,
          creator: {
            id: creator.id || bundle.creatorId,
            name: creator.name || "Unknown Creator",
            username: creator.username || "",
            profilePicture: creator.profilePicture || "",
          },
        },
      }
    })

    console.log("✅ [Unified Purchases] Successfully enriched", enrichedPurchases.length, "purchases")

    // Calculate summary statistics
    const totalSpent = purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0)
    const totalItems = purchases.length
    const uniqueCreators = creatorIds.size

    const response = {
      success: true,
      purchases: enrichedPurchases,
      summary: {
        totalItems,
        totalSpent,
        uniqueCreators,
        currency: "usd", // Default currency
      },
      metadata: {
        userId,
        fetchedAt: new Date().toISOString(),
        source: "user_subcollection",
        verified: true,
      },
    }

    console.log("📤 [Unified Purchases] Sending response:", {
      success: response.success,
      totalItems: response.summary.totalItems,
      totalSpent: response.summary.totalSpent,
      uniqueCreators: response.summary.uniqueCreators,
      userId: response.metadata.userId,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Unified Purchases] Error fetching purchases:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
