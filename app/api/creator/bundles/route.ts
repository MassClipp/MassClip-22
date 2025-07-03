import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"
import { S3Client } from "@aws-sdk/client-s3"

// Configure Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

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

    // Query bundles collection for this creator
    const bundlesSnapshot = await db
      .collection("bundles")
      .where("creatorId", "==", decodedToken.uid)
      .orderBy("createdAt", "desc")
      .get()

    const bundles = bundlesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

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
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          code: "USER_NOT_FOUND",
          message: "User profile not found",
          suggestedActions: ["Please complete your profile setup"],
        } as BundleCreationError,
        { status: 404 },
      )
    }

    const userData = userDoc.data()
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

    if (userData?.stripeAccountId) {
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
