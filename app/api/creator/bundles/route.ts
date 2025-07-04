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

interface BundleCreationError {
  code: string
  message: string
  details?: string
  suggestedActions: string[]
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [Bundles API] Fetching bundles for user: ${decodedToken.uid}`)

    // Query bundles collection for this creator - Remove orderBy to avoid index issues
    let bundlesSnapshot
    try {
      bundlesSnapshot = await db.collection("bundles").where("creatorId", "==", decodedToken.uid).get()
    } catch (firestoreError) {
      console.error("❌ [Bundles API] Firestore query error:", firestoreError)

      // Fallback: Try without the where clause to see if collection exists
      try {
        const allBundlesSnapshot = await db.collection("bundles").limit(1).get()
        console.log(`📊 [Bundles API] Collection exists, found ${allBundlesSnapshot.size} documents`)
      } catch (collectionError) {
        console.error("❌ [Bundles API] Collection doesn't exist:", collectionError)
        return NextResponse.json({
          success: true,
          bundles: [],
          count: 0,
          message: "No bundles collection found",
        })
      }

      // Return empty array if query fails
      return NextResponse.json({
        success: true,
        bundles: [],
        count: 0,
        message: "Query failed, returning empty results",
      })
    }

    const bundles = bundlesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        type: data.type || "one_time",
        creatorId: data.creatorId,
        creatorUsername: data.creatorUsername || "",
        active: data.active !== false,
        contentItems: data.contentItems || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        productId: data.productId,
        priceId: data.priceId,
        coverImage: data.coverImage,
      }
    })

    // Sort by creation date client-side (newest first)
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
    console.error("❌ [Bundles API] Error fetching bundles:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
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
      return NextResponse.json(
        {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
          suggestedActions: ["Please log in to create bundles"],
        } as BundleCreationError,
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`🔍 [Bundle Creation] User: ${userId}`)

    // Parse request body
    const body = await request.json()
    const { title, description, price, currency = "usd", type = "one_time" } = body

    console.log(`📦 [Bundle Creation] Request data:`, {
      title,
      description,
      price,
      currency,
      type,
    })

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Title is required",
          suggestedActions: ["Please provide a bundle title"],
        } as BundleCreationError,
        { status: 400 },
      )
    }

    if (!price || typeof price !== "number" || price < 0.5) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Price must be at least $0.50",
          suggestedActions: ["Please set a price of $0.50 or higher"],
        } as BundleCreationError,
        { status: 400 },
      )
    }

    if (price > 999.99) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Price cannot exceed $999.99",
          suggestedActions: ["Please set a price of $999.99 or lower"],
        } as BundleCreationError,
        { status: 400 },
      )
    }

    // Get user data to check Stripe account
    let userData = null
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      if (userDoc.exists) {
        userData = userDoc.data()
      }
    } catch (userError) {
      console.error("❌ [Bundle Creation] Error fetching user data:", userError)
      // Continue without user data
    }

    console.log(`👤 [Bundle Creation] User data:`, {
      username: userData?.username,
      hasStripeAccount: !!userData?.stripeAccountId,
      stripeOnboardingComplete: userData?.stripeOnboardingComplete,
    })

    // Create bundle document
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price,
      currency,
      type,
      creatorId: userId,
      creatorUsername: userData?.username || "",
      active: true,
      contentItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add bundle to Firestore
    const bundleRef = await db.collection("bundles").add(bundleData)
    const bundleId = bundleRef.id

    console.log(`✅ [Bundle Creation] Bundle created: ${bundleId}`)

    // Create Stripe product and price if user has connected account
    let stripeProductId = null
    let stripePriceId = null

    if (userData?.stripeAccountId && stripe) {
      try {
        console.log(`🔄 [Bundle Creation] Creating Stripe product for connected account: ${userData.stripeAccountId}`)

        // Create Stripe product on creator's connected account
        const stripeProduct = await stripe.products.create(
          {
            name: title.trim(),
            description: description?.trim() || `Premium content bundle by ${userData.username || "Creator"}`,
            metadata: {
              bundleId,
              creatorId: userId,
            },
          },
          {
            stripeAccount: userData.stripeAccountId,
          },
        )

        stripeProductId = stripeProduct.id
        console.log(`✅ [Bundle Creation] Stripe product created: ${stripeProductId}`)

        // Create Stripe price on creator's connected account
        const stripePrice = await stripe.prices.create(
          {
            unit_amount: Math.round(price * 100), // Convert to cents
            currency: currency.toLowerCase(),
            product: stripeProductId,
            metadata: {
              bundleId,
              creatorId: userId,
            },
          },
          {
            stripeAccount: userData.stripeAccountId,
          },
        )

        stripePriceId = stripePrice.id
        console.log(`✅ [Bundle Creation] Stripe price created: ${stripePriceId}`)

        // Update bundle with Stripe IDs
        await bundleRef.update({
          productId: stripeProductId,
          priceId: stripePriceId,
          updatedAt: new Date(),
        })

        console.log(`✅ [Bundle Creation] Bundle updated with Stripe IDs`)
      } catch (stripeError) {
        console.error("❌ [Bundle Creation] Stripe error:", stripeError)
        // Don't fail the entire creation for Stripe issues
        console.log("⚠️ [Bundle Creation] Continuing without Stripe integration")
      }
    } else {
      console.log("⚠️ [Bundle Creation] No Stripe account connected, skipping Stripe integration")
    }

    // Return success response
    const response = {
      success: true,
      bundleId,
      bundle: {
        id: bundleId,
        ...bundleData,
        productId: stripeProductId,
        priceId: stripePriceId,
      },
      stripe: {
        productId: stripeProductId,
        priceId: stripePriceId,
      },
      message: "Bundle created successfully",
    }

    console.log(`✅ [Bundle Creation] Success response:`, response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ [Bundle Creation] Error:", error)

    const errorResponse: BundleCreationError = {
      code: "CREATION_FAILED",
      message: "Failed to create bundle",
      details: error instanceof Error ? error.message : "Unknown error",
      suggestedActions: [
        "Check your internet connection",
        "Try again in a few moments",
        "Contact support if the issue persists",
      ],
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
