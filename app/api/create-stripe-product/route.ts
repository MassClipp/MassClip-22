import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { auth } from "firebase-admin"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

export async function POST(request: Request) {
  console.log("------------ 🏷️ CREATE STRIPE PRODUCT START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🏷️ PRODUCT ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Parse the request body
    const requestData = await request.json()
    console.log("🏷️ PRODUCT: Request data:", JSON.stringify(requestData, null, 2))

    // Validate required fields
    if (!requestData.creatorId) {
      console.error("🏷️ PRODUCT ERROR: Missing creatorId in request")
      return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })
    }

    if (!requestData.displayName) {
      console.error("🏷️ PRODUCT ERROR: Missing displayName in request")
      return NextResponse.json({ error: "Missing displayName" }, { status: 400 })
    }

    if (requestData.priceInDollars === undefined || requestData.priceInDollars === null) {
      console.error("🏷️ PRODUCT ERROR: Missing priceInDollars in request")
      return NextResponse.json({ error: "Missing priceInDollars" }, { status: 400 })
    }

    if (!requestData.mode || !["one-time", "subscription"].includes(requestData.mode)) {
      console.error("🏷️ PRODUCT ERROR: Invalid mode in request")
      return NextResponse.json({ error: "Invalid mode. Must be 'one-time' or 'subscription'" }, { status: 400 })
    }

    // Verify authentication and authorization
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("🏷️ PRODUCT ERROR: Missing or invalid Authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await auth().verifyIdToken(idToken)
    } catch (error) {
      console.error("🏷️ PRODUCT ERROR: Invalid ID token:", error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify that the user is the creator
    if (decodedToken.uid !== requestData.creatorId) {
      console.error("🏷️ PRODUCT ERROR: User is not authorized to modify this creator's settings")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verify that the creator exists in Firestore
    const creatorDoc = await db.collection("users").doc(requestData.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`🏷️ PRODUCT ERROR: Creator ${requestData.creatorId} does not exist in Firestore`)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // If premium is disabled, update Firestore and return
    if (!requestData.enablePremium) {
      await db.collection("users").doc(requestData.creatorId).update({
        premiumEnabled: false,
        premiumUpdatedAt: new Date(),
      })

      console.log(`🏷️ PRODUCT: Premium content disabled for creator ${requestData.creatorId}`)
      console.log("------------ 🏷️ CREATE STRIPE PRODUCT END ------------")

      return NextResponse.json({
        success: true,
        premiumEnabled: false,
      })
    }

    // Convert price to cents for Stripe
    const priceInCents = Math.round(requestData.priceInDollars * 100)

    // Check if the creator already has a product
    const creatorData = creatorDoc.data()
    let productId = creatorData.stripeProductId
    let product

    // Create or retrieve the product
    if (!productId) {
      // Create a new product
      product = await stripe.products.create({
        name: `${requestData.displayName}'s Premium Content`,
        description: `Premium content access for ${requestData.displayName}`,
        metadata: {
          creatorId: requestData.creatorId,
        },
      })
      productId = product.id
      console.log(`🏷️ PRODUCT: Created new product with ID: ${productId}`)
    } else {
      // Retrieve existing product
      try {
        product = await stripe.products.retrieve(productId)
        console.log(`🏷️ PRODUCT: Retrieved existing product with ID: ${productId}`)
      } catch (error) {
        // If product doesn't exist in Stripe, create a new one
        console.error(`🏷️ PRODUCT ERROR: Failed to retrieve product ${productId}:`, error)
        product = await stripe.products.create({
          name: `${requestData.displayName}'s Premium Content`,
          description: `Premium content access for ${requestData.displayName}`,
          metadata: {
            creatorId: requestData.creatorId,
          },
        })
        productId = product.id
        console.log(`🏷️ PRODUCT: Created new product with ID: ${productId}`)
      }
    }

    // Create a price for the product
    const priceData: Stripe.PriceCreateParams = {
      product: productId,
      currency: "usd",
      unit_amount: priceInCents,
      metadata: {
        creatorId: requestData.creatorId,
      },
    }

    // Add recurring parameters for subscription
    if (requestData.mode === "subscription") {
      priceData.recurring = {
        interval: "month",
      }
    }

    const price = await stripe.prices.create(priceData)
    console.log(`🏷️ PRODUCT: Created price with ID: ${price.id}`)

    // Update the creator's document in Firestore
    await db.collection("users").doc(requestData.creatorId).update({
      stripeProductId: productId,
      stripePriceId: price.id,
      premiumEnabled: true,
      premiumPrice: requestData.priceInDollars,
      paymentMode: requestData.mode,
      premiumUpdatedAt: new Date(),
    })

    console.log(`🏷️ PRODUCT: Updated creator ${requestData.creatorId} with product and price IDs`)
    console.log("------------ 🏷️ CREATE STRIPE PRODUCT END ------------")

    return NextResponse.json({
      success: true,
      productId: productId,
      priceId: price.id,
      premiumEnabled: true,
    })
  } catch (error: any) {
    console.error("🏷️ PRODUCT ERROR:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create Stripe product",
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
