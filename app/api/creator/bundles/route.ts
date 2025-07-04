import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

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
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Bundles API] Fetching bundles for user: ${userId}`)

    // Query bundles collection
    const bundlesRef = db.collection("bundles")
    const bundlesQuery = bundlesRef.where("creatorId", "==", userId)
    const bundlesSnapshot = await bundlesQuery.get()

    const bundles: any[] = []

    bundlesSnapshot.forEach((doc) => {
      const data = doc.data()
      bundles.push({
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        coverImage: data.coverImage || null,
        active: data.active !== false,
        contentItems: data.contentItems || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        productId: data.productId || null,
        priceId: data.priceId || null,
        type: data.type || "one_time",
      })
    })

    // Sort by creation date (newest first)
    bundles.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
      const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ [Bundles API] Found ${bundles.length} bundles`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error) {
    console.error("❌ [Bundles API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { title, description, price, currency = "usd", type = "one_time" } = body

    if (!title || !price) {
      return NextResponse.json({ error: "Title and price are required" }, { status: 400 })
    }

    console.log(`🔍 [Bundles API] Creating bundle for user: ${userId}`)

    // Create bundle document
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number(price),
      currency,
      type,
      creatorId: userId,
      active: true,
      contentItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const bundleRef = await db.collection("bundles").add(bundleData)
    const bundleId = bundleRef.id

    console.log(`✅ [Bundles API] Created bundle: ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundleId,
      message: "Bundle created successfully",
    })
  } catch (error) {
    console.error("❌ [Bundles API] Error creating bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
