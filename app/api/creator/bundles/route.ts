import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { getAuth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { db } from "@/lib/firebase-admin"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("❌ [Bundles API] Firebase Admin initialization error:", error)
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface BundleCreationError {
  code: string
  message: string
  details?: string
  suggestedActions: string[]
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Bundles API] Fetching user bundles")

    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.log("❌ [Bundles API] No valid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Bundles API] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [Bundles API] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Query bundles collection for this user
    const bundlesQuery = await db.collection("bundles").where("creatorId", "==", userId).get()

    // If no results, try with userId field
    let bundles: any[] = []

    if (!bundlesQuery.empty) {
      bundles = bundlesQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } else {
      // Try with userId field
      const userIdQuery = await db.collection("bundles").where("userId", "==", userId).get()
      bundles = userIdQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    }

    // If still no bundles, try productBoxes collection as fallback
    if (bundles.length === 0) {
      console.log("🔄 [Bundles API] No bundles found, trying productBoxes collection")
      const productBoxesQuery = await db.collection("productBoxes").where("creatorId", "==", userId).get()

      bundles = productBoxesQuery.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title,
          description: data.description || "",
          price: data.price || 0,
          currency: data.currency || "usd",
          active: data.active !== false,
          contentItems: data.contentItems || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          creatorId: userId,
        }
      })
    }

    // Sort by creation date (newest first)
    bundles.sort((a, b) => {
      const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0
      const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ [Bundles API] Found ${bundles.length} bundles for user ${userId}`)

    return NextResponse.json({
      success: true,
      bundles,
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
    console.log("🔍 [Bundles API] Creating new bundle")

    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.log("❌ [Bundles API] No valid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Bundles API] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [Bundles API] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const body = await request.json()
    const { title, description, price, currency = "usd", type = "one_time" } = body

    if (!title || price === undefined) {
      return NextResponse.json({ error: "Title and price are required" }, { status: 400 })
    }

    // Create bundle document
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number(price),
      currency,
      active: true,
      contentItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorId: userId,
      userId: userId, // Add both fields for compatibility
    }

    const docRef = await db.collection("bundles").add(bundleData)

    console.log(`✅ [Bundles API] Created bundle ${docRef.id} for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Bundle created successfully",
      bundleId: docRef.id,
    })
  } catch (error) {
    console.error("❌ [Bundles API] Create error:", error)
    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
