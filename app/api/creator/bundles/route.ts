import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"
import Stripe from "stripe"

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
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("🔍 [Bundles API] Fetching bundles for user:", userId)

    // Use simple query without orderBy to avoid index requirements initially
    const snapshot = await db.collection("bundles").where("creatorId", "==", userId).get()

    // Sort in memory to avoid index requirements
    const bundles = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        // Sort by createdAt descending (newest first)
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.toMillis() - a.createdAt.toMillis()
      })

    console.log(`✅ [Bundles API] Found ${bundles.length} bundles`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error) {
    console.error("❌ [Bundles API] Error:", error)

    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error("❌ [Bundles API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        userId: "hidden_for_security",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  let createdStripeProduct: Stripe.Product | null = null
  let createdStripePrice: Stripe.Price | null = null
  let createdFirestoreDoc: any = null

  try {
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          code: "AUTHENTICATION_REQUIRED",
          message: "Please log in to create bundles",
          suggestedActions: ["Log out and log back in", "Refresh the page", "Clear your browser cache"],
        },
        { status: 401 },
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    console.log("🔍 [Bundles API] Creating bundle:", body.title)

    // Validate input data
    const validationError = validateBundleData(body)
    if (validationError) {
      return NextResponse.json(validationError, { status: 400 })
    }

    // Get user data for Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          code: "USER_NOT_FOUND",
          message: "User account not found",
          suggestedActions: ["Try logging out and back in", "Contact support if the issue persists"],
        },
        { status: 404 },
      )
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    console.log("🔍 [Bundles API] User data:", {
      userId,
      hasStripeAccount: !!stripeAccountId,
      username: userData?.username,
    })

    let productId = null
    let priceId = null
    let stripeError = null

    // Attempt Stripe integration if account exists
    if (stripeAccountId) {
      console.log("🔍 [Bundles API] Attempting Stripe integration")

      // Validate Stripe account first
      const stripeValidationError = await validateStripeAccount(userData)
      if (stripeValidationError) {
        console.log("⚠️ [Bundles API] Stripe validation failed:", stripeValidationError.message)
        stripeError = stripeValidationError
      } else {
        const stripeResult = await createStripeProductAndPrice({
          title: body.title,
          description: body.description || "",
          price: body.price,
          currency: body.currency || "usd",
          type: body.type || "one_time",
          creatorId: userId,
          creatorUsername: userData.username || "unknown",
          stripeAccountId,
        })

        if (stripeResult.success) {
          productId = stripeResult.productId
          priceId = stripeResult.priceId
          createdStripeProduct = { id: productId } as Stripe.Product
          createdStripePrice = { id: priceId } as Stripe.Price
          console.log("✅ [Bundles API] Stripe integration successful")
        } else {
          console.log("⚠️ [Bundles API] Stripe integration failed:", stripeResult.error?.message)
          stripeError = stripeResult.error
        }
      }
    }

    // Save to Firestore regardless of Stripe status
    const bundleData = {
      title: body.title,
      description: body.description || null,
      price: body.price,
      currency: body.currency || "usd",
      type: body.type || "one_time",
      coverImage: body.coverImage || null,
      contentItems: body.contentItems || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      creatorId: userId,
      productId,
      priceId,
      stripeStatus: productId ? "synced" : "pending",
      stripeError: stripeError ? stripeError.message : null,
    }

    const docRef = await db.collection("bundles").add(bundleData)
    createdFirestoreDoc = docRef

    const newBundle = {
      id: docRef.id,
      ...bundleData,
    }

    console.log(`✅ [Bundles API] Created bundle: ${docRef.id}`)

    const response = {
      success: true,
      bundle: newBundle,
      stripe: {
        productId,
        priceId,
        status: productId ? "synced" : "failed",
        error: stripeError,
      },
      message: productId
        ? "Bundle created successfully and synced with Stripe"
        : `Bundle created successfully${stripeError ? ` (Stripe sync failed: ${stripeError.message})` : " (Stripe sync skipped)"}`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ [Bundles API] Error creating:", error)

    // Enhanced error logging
    if (error instanceof Error) {
      console.error("❌ [Bundles API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }

    // Rollback on error
    if (createdFirestoreDoc) {
      try {
        await createdFirestoreDoc.delete()
        console.log("🔄 [Bundles API] Rolled back Firestore document")
      } catch (rollbackError) {
        console.error("❌ [Bundles API] Failed to rollback Firestore:", rollbackError)
      }
    }

    // Rollback Stripe resources
    if (createdStripeProduct || createdStripePrice) {
      await rollbackCreatedResources(createdStripeProduct, createdStripePrice, null)
    }

    return NextResponse.json(
      {
        code: "CREATION_FAILED",
        message: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        suggestedActions: [
          "Check your internet connection",
          "Verify your account is properly set up",
          "Try again in a few moments",
          "Contact support if the issue persists",
        ],
      },
      { status: 500 },
    )
  }
}

// Validation functions
function validateBundleData(data: any): BundleCreationError | null {
  const { title, price, currency, type } = data

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return {
      code: "INVALID_TITLE",
      message: "Bundle title is required",
      suggestedActions: ["Enter a descriptive title for your bundle"],
    }
  }

  if (title.trim().length > 100) {
    return {
      code: "TITLE_TOO_LONG",
      message: "Bundle title is too long",
      details: `Title must be 100 characters or less (current: ${title.trim().length})`,
      suggestedActions: ["Shorten your bundle title to 100 characters or less"],
    }
  }

  if (!price || isNaN(Number.parseFloat(price.toString()))) {
    return {
      code: "INVALID_PRICE",
      message: "Valid price is required",
      suggestedActions: ["Enter a valid price (e.g., 9.99)"],
    }
  }

  const priceValue = Number.parseFloat(price.toString())
  if (priceValue < 0.5) {
    return {
      code: "PRICE_TOO_LOW",
      message: "Price must be at least $0.50",
      suggestedActions: ["Set a price of $0.50 or higher"],
    }
  }

  if (priceValue > 999.99) {
    return {
      code: "PRICE_TOO_HIGH",
      message: "Price cannot exceed $999.99",
      suggestedActions: ["Set a price of $999.99 or lower"],
    }
  }

  if (currency && !["usd", "eur", "gbp"].includes(currency.toLowerCase())) {
    return {
      code: "UNSUPPORTED_CURRENCY",
      message: "Unsupported currency",
      details: `Currency '${currency}' is not supported`,
      suggestedActions: ["Use USD, EUR, or GBP"],
    }
  }

  if (type && !["one_time", "subscription"].includes(type)) {
    return {
      code: "INVALID_BILLING_TYPE",
      message: "Invalid billing type",
      suggestedActions: ["Select either 'One-time payment' or 'Subscription'"],
    }
  }

  return null
}

async function validateStripeAccount(userData: any): Promise<BundleCreationError | null> {
  if (!userData.stripeAccountId) {
    return {
      code: "NO_STRIPE_ACCOUNT",
      message: "Stripe account not connected",
      suggestedActions: [
        "Go to Dashboard > Settings > Stripe",
        "Click 'Connect with Stripe'",
        "Complete the onboarding process",
      ],
    }
  }

  try {
    console.log("🔍 [Bundles API] Verifying Stripe account status")
    const account = await stripe.accounts.retrieve(userData.stripeAccountId)

    console.log("📊 [Bundles API] Stripe account details:", {
      id: account.id,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      requirements_currently_due: account.requirements?.currently_due?.length || 0,
      requirements_past_due: account.requirements?.past_due?.length || 0,
    })

    // Check if account can accept charges (most important for product creation)
    if (!account.charges_enabled) {
      return {
        code: "CHARGES_DISABLED",
        message: "Your Stripe account cannot accept payments yet",
        details: "Charges are currently disabled on your account",
        suggestedActions: [
          "Complete your Stripe onboarding at https://dashboard.stripe.com",
          "Submit any pending verification documents",
          "Check your email for Stripe verification requests",
          "Contact Stripe support if you need assistance",
        ],
      }
    }

    // Check for critical past due requirements
    if (account.requirements?.past_due && account.requirements.past_due.length > 0) {
      return {
        code: "REQUIREMENTS_PAST_DUE",
        message: "Stripe account has overdue requirements",
        details: `Critical requirements past due: ${account.requirements.past_due.join(", ")}`,
        suggestedActions: [
          "Visit your Stripe dashboard immediately",
          "Complete all overdue requirements",
          "Upload any requested documents",
          "These must be resolved before accepting payments",
        ],
      }
    }

    console.log("✅ [Bundles API] Stripe account verified successfully")
    return null
  } catch (error: any) {
    console.error("❌ [Bundles API] Stripe account verification failed:", error)
    return {
      code: "STRIPE_VERIFICATION_FAILED",
      message: "Unable to verify Stripe account status",
      details: error.message || "Unknown verification error",
      suggestedActions: [
        "Check your internet connection",
        "Verify your Stripe account is properly connected",
        "Try again in a few moments",
        "Contact support if the issue persists",
      ],
    }
  }
}

interface StripeIntegrationResult {
  success: boolean
  productId?: string
  priceId?: string
  error?: BundleCreationError
}

async function createStripeProductAndPrice(params: {
  title: string
  description: string
  price: number
  currency: string
  type: string
  creatorId: string
  creatorUsername: string
  stripeAccountId: string
}): Promise<StripeIntegrationResult> {
  let productId: string | null = null
  let priceId: string | null = null

  try {
    // Create Stripe Product
    console.log("🔍 [Stripe Integration] Creating product with params:", {
      title: params.title,
      price: params.price,
      currency: params.currency,
      type: params.type,
      stripeAccountId: params.stripeAccountId,
    })

    // Prepare product data - only include description if it's not empty
    const productData: Stripe.ProductCreateParams = {
      name: params.title,
      metadata: {
        creatorId: params.creatorId,
        creatorUsername: params.creatorUsername,
        type: "bundle",
        platform: "massclip",
      },
    }

    // Only add description if it exists and is not empty
    const description = params.description?.trim()
    if (description && description.length > 0) {
      productData.description = description
    }

    const product = await stripe.products.create(productData, {
      stripeAccount: params.stripeAccountId,
    })

    productId = product.id
    console.log("✅ [Stripe Integration] Product created:", productId)

    // Create Stripe Price
    const priceData: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: Math.round(params.price * 100), // Convert to cents
      currency: params.currency,
      metadata: {
        creatorId: params.creatorId,
        type: "bundle",
        platform: "massclip",
      },
    }

    // Add recurring billing for subscriptions
    if (params.type === "subscription") {
      priceData.recurring = { interval: "month" }
    }

    const price = await stripe.prices.create(priceData, {
      stripeAccount: params.stripeAccountId,
    })

    priceId = price.id
    console.log("✅ [Stripe Integration] Price created:", priceId)

    return {
      success: true,
      productId,
      priceId,
    }
  } catch (error: any) {
    console.error("❌ [Stripe Integration] Error:", error)

    // Cleanup any created resources
    if (productId) {
      try {
        await stripe.products.update(productId, { active: false }, { stripeAccount: params.stripeAccountId })
        console.log("🔄 [Stripe Integration] Cleaned up product:", productId)
      } catch (cleanupError) {
        console.error("❌ [Stripe Integration] Failed to cleanup product:", cleanupError)
      }
    }

    return {
      success: false,
      error: handleStripeError(error, productId ? "price" : "product"),
    }
  }
}

function handleStripeError(error: any, context: "product" | "price"): BundleCreationError {
  console.error(`❌ [Stripe Integration] ${context} error:`, {
    type: error.type,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    requestId: error.requestId,
  })

  // Rate limiting
  if (error.type === "StripeRateLimitError") {
    return {
      code: "STRIPE_RATE_LIMIT",
      message: "Too many requests to Stripe",
      details: "Please wait a moment before trying again",
      suggestedActions: ["Wait 30 seconds and try again", "Contact support if this continues"],
    }
  }

  // Authentication errors
  if (error.type === "StripeAuthenticationError") {
    return {
      code: "STRIPE_AUTH_ERROR",
      message: "Stripe authentication failed",
      details: "There's an issue with your Stripe account connection",
      suggestedActions: [
        "Reconnect your Stripe account",
        "Check your Stripe account status",
        "Contact support for assistance",
      ],
    }
  }

  // Invalid request errors
  if (error.type === "StripeInvalidRequestError") {
    return {
      code: "STRIPE_INVALID_REQUEST",
      message: `Invalid request to Stripe for ${context} creation`,
      details: error.message,
      suggestedActions: [
        "Check that all bundle information is valid",
        "Ensure your Stripe account is properly configured",
        "Contact support if the issue persists",
      ],
    }
  }

  // API errors
  if (error.type === "StripeAPIError") {
    return {
      code: "STRIPE_API_ERROR",
      message: "Stripe API error occurred",
      details: error.message,
      suggestedActions: [
        "This is a temporary issue with Stripe",
        "Please try again in a few moments",
        "Contact support if the issue continues",
      ],
    }
  }

  // Connection errors
  if (error.type === "StripeConnectionError") {
    return {
      code: "STRIPE_CONNECTION_ERROR",
      message: "Unable to connect to Stripe",
      details: "Network connection to Stripe failed",
      suggestedActions: [
        "Check your internet connection",
        "Try again in a few moments",
        "Contact support if connectivity issues persist",
      ],
    }
  }

  // Generic error
  return {
    code: "STRIPE_UNKNOWN_ERROR",
    message: `Unknown error occurred while creating Stripe ${context}`,
    details: error.message || "No additional details available",
    suggestedActions: [
      "Please try again",
      "Check your Stripe account status",
      "Contact support with this error message",
    ],
  }
}

async function rollbackCreatedResources(
  stripeProduct: Stripe.Product | null,
  stripePrice: Stripe.Price | null,
  firestoreDoc: any,
): Promise<void> {
  try {
    console.log("🔄 [Bundles API] Rolling back created resources")

    // Rollback Firestore document
    if (firestoreDoc) {
      await firestoreDoc.delete()
      console.log("🔄 [Bundles API] Deleted Firestore document")
    }

    // Rollback Stripe resources
    if (stripeProduct && stripePrice) {
      await rollbackStripeResources(stripeProduct.id, stripePrice.id, "")
    }
  } catch (error) {
    console.error("❌ [Bundles API] Failed to rollback resources:", error)
  }
}

async function rollbackStripeResources(productId: string, priceId: string, stripeAccountId: string): Promise<void> {
  try {
    console.log("🔄 [Bundles API] Rolling back Stripe resources")

    // Deactivate price first
    if (priceId) {
      await stripe.prices.update(priceId, { active: false }, { stripeAccount: stripeAccountId })
      console.log("🔄 [Bundles API] Deactivated Stripe price:", priceId)
    }

    // Then deactivate product
    if (productId) {
      await stripe.products.update(productId, { active: false }, { stripeAccount: stripeAccountId })
      console.log("🔄 [Bundles API] Deactivated Stripe product:", productId)
    }
  } catch (error) {
    console.error("❌ [Bundles API] Failed to rollback Stripe resources:", error)
  }
}
