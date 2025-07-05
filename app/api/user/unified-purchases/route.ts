import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
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
    console.log("🔄 [Unified Purchases API] Starting request...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Unified Purchases API] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log("🔑 [Unified Purchases API] Got token, verifying...")

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Unified Purchases API] Token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Unified Purchases API] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("👤 [Unified Purchases API] Fetching purchases for user:", userId)

    // Initialize purchases array
    const allPurchases: any[] = []

    // 1. Check userPurchases collection
    try {
      console.log("🔍 [Unified Purchases API] Checking userPurchases collection...")
      const userPurchasesRef = db.collection("userPurchases").where("userId", "==", userId)
      const userPurchasesSnapshot = await userPurchasesRef.get()

      if (!userPurchasesSnapshot.empty) {
        console.log(`📦 [Unified Purchases API] Found ${userPurchasesSnapshot.size} purchases in userPurchases`)
        userPurchasesSnapshot.forEach((doc) => {
          const data = doc.data()
          allPurchases.push({
            id: doc.id,
            ...data,
            source: "userPurchases",
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
            purchasedAt: data.purchasedAt?.toDate?.() || data.purchasedAt || data.createdAt?.toDate?.() || new Date(),
          })
        })
      }
    } catch (error) {
      console.error("⚠️ [Unified Purchases API] Error fetching userPurchases:", error)
    }

    // 2. Check purchases collection
    try {
      console.log("🔍 [Unified Purchases API] Checking purchases collection...")
      const purchasesRef = db.collection("purchases").where("userId", "==", userId)
      const purchasesSnapshot = await purchasesRef.get()

      if (!purchasesSnapshot.empty) {
        console.log(`📦 [Unified Purchases API] Found ${purchasesSnapshot.size} purchases in purchases`)
        purchasesSnapshot.forEach((doc) => {
          const data = doc.data()
          // Avoid duplicates by checking if we already have this purchase
          const existingPurchase = allPurchases.find(
            (p) =>
              p.id === doc.id || (p.productBoxId && p.productBoxId === data.productBoxId && p.userId === data.userId),
          )

          if (!existingPurchase) {
            allPurchases.push({
              id: doc.id,
              ...data,
              source: "purchases",
              createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
              purchasedAt: data.purchasedAt?.toDate?.() || data.purchasedAt || data.createdAt?.toDate?.() || new Date(),
            })
          }
        })
      }
    } catch (error) {
      console.error("⚠️ [Unified Purchases API] Error fetching purchases:", error)
    }

    // 3. Check productBoxPurchases collection
    try {
      console.log("🔍 [Unified Purchases API] Checking productBoxPurchases collection...")
      const productBoxPurchasesRef = db.collection("productBoxPurchases").where("userId", "==", userId)
      const productBoxPurchasesSnapshot = await productBoxPurchasesRef.get()

      if (!productBoxPurchasesSnapshot.empty) {
        console.log(
          `📦 [Unified Purchases API] Found ${productBoxPurchasesSnapshot.size} purchases in productBoxPurchases`,
        )
        productBoxPurchasesSnapshot.forEach((doc) => {
          const data = doc.data()
          // Avoid duplicates
          const existingPurchase = allPurchases.find(
            (p) =>
              p.id === doc.id || (p.productBoxId && p.productBoxId === data.productBoxId && p.userId === data.userId),
          )

          if (!existingPurchase) {
            allPurchases.push({
              id: doc.id,
              ...data,
              source: "productBoxPurchases",
              createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
              purchasedAt: data.purchasedAt?.toDate?.() || data.purchasedAt || data.createdAt?.toDate?.() || new Date(),
            })
          }
        })
      }
    } catch (error) {
      console.error("⚠️ [Unified Purchases API] Error fetching productBoxPurchases:", error)
    }

    // 4. Enhance purchases with additional metadata
    console.log(`🔧 [Unified Purchases API] Enhancing ${allPurchases.length} purchases with metadata...`)

    const enhancedPurchases = await Promise.all(
      allPurchases.map(async (purchase) => {
        try {
          // Get product box metadata if available
          if (purchase.productBoxId) {
            try {
              const productBoxDoc = await db.collection("productBoxes").doc(purchase.productBoxId).get()
              if (productBoxDoc.exists) {
                const productBoxData = productBoxDoc.data()
                purchase.metadata = {
                  ...purchase.metadata,
                  title: purchase.title || productBoxData?.title || "Untitled Product",
                  description: purchase.description || productBoxData?.description || "",
                  thumbnailUrl: purchase.thumbnailUrl || productBoxData?.thumbnailUrl || "",
                  contentCount: productBoxData?.contentCount || 0,
                  contentType: productBoxData?.contentType || "video",
                }
                purchase.title = purchase.title || productBoxData?.title || "Untitled Product"
                purchase.thumbnailUrl = purchase.thumbnailUrl || productBoxData?.thumbnailUrl || ""
              }
            } catch (error) {
              console.error("⚠️ [Unified Purchases API] Error fetching product box metadata:", error)
            }
          }

          // Get bundle metadata if available
          if (purchase.bundleId) {
            try {
              const bundleDoc = await db.collection("bundles").doc(purchase.bundleId).get()
              if (bundleDoc.exists) {
                const bundleData = bundleDoc.data()
                purchase.metadata = {
                  ...purchase.metadata,
                  title: purchase.title || bundleData?.title || "Untitled Bundle",
                  description: purchase.description || bundleData?.description || "",
                  thumbnailUrl: purchase.thumbnailUrl || bundleData?.thumbnailUrl || "",
                  contentCount: bundleData?.contentCount || 0,
                  contentType: "bundle",
                }
                purchase.title = purchase.title || bundleData?.title || "Untitled Bundle"
                purchase.thumbnailUrl = purchase.thumbnailUrl || bundleData?.thumbnailUrl || ""
                purchase.type = "bundle"
              }
            } catch (error) {
              console.error("⚠️ [Unified Purchases API] Error fetching bundle metadata:", error)
            }
          }

          // Get creator information
          if (purchase.creatorId) {
            try {
              const creatorDoc = await db.collection("users").doc(purchase.creatorId).get()
              if (creatorDoc.exists) {
                const creatorData = creatorDoc.data()
                purchase.creatorUsername = purchase.creatorUsername || creatorData?.username || "Unknown Creator"
              }
            } catch (error) {
              console.error("⚠️ [Unified Purchases API] Error fetching creator info:", error)
            }
          }

          return purchase
        } catch (error) {
          console.error("⚠️ [Unified Purchases API] Error enhancing purchase:", error)
          return purchase
        }
      }),
    )

    // Sort by purchase date (most recent first)
    enhancedPurchases.sort((a, b) => {
      const dateA = new Date(a.purchasedAt || a.createdAt || 0)
      const dateB = new Date(b.purchasedAt || b.createdAt || 0)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ [Unified Purchases API] Successfully fetched ${enhancedPurchases.length} purchases`)

    // Return purchases (even if empty array)
    return NextResponse.json({
      success: true,
      purchases: enhancedPurchases,
      count: enhancedPurchases.length,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
