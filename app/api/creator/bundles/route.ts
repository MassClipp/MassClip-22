import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

// Helper function to verify ID token
async function verifyIdToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [Bundles API] Fetching bundles for user: ${decodedToken.uid}`)

    let bundles: any[] = []

    try {
      // Try to fetch from bundles collection first
      const bundlesQuery = db.collection("bundles").where("creatorId", "==", decodedToken.uid)
      const bundlesSnapshot = await bundlesQuery.get()

      if (!bundlesSnapshot.empty) {
        bundles = bundlesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        console.log(`✅ [Bundles API] Found ${bundles.length} bundles in bundles collection`)
      } else {
        console.log("📝 [Bundles API] No bundles found in bundles collection, checking productBoxes...")

        // Fallback to productBoxes collection
        const productBoxesQuery = db.collection("productBoxes").where("creatorId", "==", decodedToken.uid)
        const productBoxesSnapshot = await productBoxesQuery.get()

        if (!productBoxesSnapshot.empty) {
          bundles = productBoxesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          console.log(`✅ [Bundles API] Found ${bundles.length} bundles in productBoxes collection`)
        }
      }
    } catch (firestoreError) {
      console.error("❌ [Bundles API] Firestore error:", firestoreError)

      // Return empty array instead of failing
      bundles = []
    }

    // Sort bundles by creation date (client-side sorting)
    bundles.sort((a, b) => {
      const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0
      const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`📦 [Bundles API] Returning ${bundles.length} bundles`)

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
        bundles: [], // Return empty array as fallback
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, price, currency = "usd", type = "one_time" } = body

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!price || price < 0.5) {
      return NextResponse.json({ error: "Price must be at least $0.50" }, { status: 400 })
    }

    console.log(`🔨 [Bundles API] Creating bundle for user: ${decodedToken.uid}`)

    // Get user data for Stripe account
    const userDoc = await db.collection("users").doc(decodedToken.uid).get()
    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    let productId = null
    let priceId = null

    // Create Stripe product and price if Stripe is configured
    if (stripe && stripeAccountId) {
      try {
        console.log(`💳 [Bundles API] Creating Stripe product for account: ${stripeAccountId}`)

        const product = await stripe.products.create(
          {
            name: title.trim(),
            description: description?.trim() || "",
            metadata: {
              creatorId: decodedToken.uid,
              type: "bundle",
            },
          },
          {
            stripeAccount: stripeAccountId,
          },
        )

        const stripePrice = await stripe.prices.create(
          {
            unit_amount: Math.round(price * 100),
            currency: currency.toLowerCase(),
            product: product.id,
            metadata: {
              creatorId: decodedToken.uid,
              type: "bundle",
            },
          },
          {
            stripeAccount: stripeAccountId,
          },
        )

        productId = product.id
        priceId = stripePrice.id

        console.log(`✅ [Bundles API] Created Stripe product: ${productId}, price: ${priceId}`)
      } catch (stripeError) {
        console.error("❌ [Bundles API] Stripe error:", stripeError)
        // Continue without Stripe integration
      }
    }

    // Create bundle in Firestore
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number(price),
      currency: currency.toLowerCase(),
      type,
      creatorId: decodedToken.uid,
      productId,
      priceId,
      active: true,
      contentItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const bundleRef = await db.collection("bundles").add(bundleData)

    console.log(`✅ [Bundles API] Bundle created with ID: ${bundleRef.id}`)

    return NextResponse.json({
      success: true,
      message: "Bundle created successfully",
      bundleId: bundleRef.id,
      productId,
      priceId,
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
