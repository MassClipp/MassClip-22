import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

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

    if (requestData.priceInDollars === undefined || requestData.priceInDollars <= 0) {
      console.error("🏷️ PRODUCT ERROR: Invalid priceInDollars in request")
      return NextResponse.json({ error: "Invalid price" }, { status: 400 })
    }

    if (!["one-time", "subscription"].includes(requestData.mode)) {
      console.error("🏷️ PRODUCT ERROR: Invalid mode in request")
      return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()
    const auth = getAuth()

    // Verify the user exists and is authorized
    try {
      const userRecord = await auth.getUser(requestData.creatorId)
      if (!userRecord) {
        console.error(`🏷️ PRODUCT ERROR: User ${requestData.creatorId} does not exist`)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
    } catch (error) {
      console.error(`🏷️ PRODUCT ERROR: Failed to verify user ${requestData.creatorId}`, error)
      return NextResponse.json({ error: "User verification failed" }, { status: 401 })
    }

    // Get the user document to check for Stripe account
    const userDoc = await db.collection("users").doc(requestData.creatorId).get()
    if (!userDoc.exists) {
      console.error(`🏷️ PRODUCT ERROR: User document for ${requestData.creatorId} not found`)
      return NextResponse.json({ error: "User document not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    if (!userData?.stripeAccountId) {
      console.error(`🏷️ PRODUCT ERROR: User ${requestData.creatorId} has no Stripe account connected`)
      return NextResponse.json({ error: "Stripe account not connected" }, { status: 400 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // If enablePremium is false, just update the user document
    if (requestData.enablePremium === false) {
      await db.collection("users").doc(requestData.creatorId).update({
        premiumEnabled: false,
        premiumUpdatedAt: new Date(),
      })

      console.log(`🏷️ PRODUCT: Premium content disabled for user ${requestData.creatorId}`)
      console.log("------------ 🏷️ CREATE STRIPE PRODUCT END ------------")

      return NextResponse.json({
        success: true,
        premiumEnabled: false,
      })
    }

    // Create or retrieve the Stripe product
    let product
    let price

    // Check if the user already has a product
    if (userData.stripeProductId) {
      try {
        // Try to retrieve the existing product
        product = await stripe.products.retrieve(userData.stripeProductId)
        console.log(`🏷️ PRODUCT: Retrieved existing product: ${product.id}`)

        // Update the product name if needed
        if (product.name !== `Premium Content by ${requestData.displayName}`) {
          product = await stripe.products.update(userData.stripeProductId, {
            name: `Premium Content by ${requestData.displayName}`,
          })
          console.log(`🏷️ PRODUCT: Updated product name: ${product.id}`)
        }
      } catch (error) {
        console.log(`🏷️ PRODUCT: Existing product not found, creating new one`)
        // If the product doesn't exist, create a new one
        product = null
      }
    }

    // Create a new product if needed
    if (!product) {
      product = await stripe.products.create({
        name: `Premium Content by ${requestData.displayName}`,
        description: `Premium content access for ${requestData.displayName}`,
        metadata: {
          creatorId: requestData.creatorId,
        },
      })
      console.log(`🏷️ PRODUCT: Created new product: ${product.id}`)
    }

    // Convert price to cents for Stripe
    const priceInCents = Math.round(requestData.priceInDollars * 100)

    // Create a new price
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
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

    price = await stripe.prices.create(priceData)
    console.log(`🏷️ PRODUCT: Created price: ${price.id}`)

    // Update the user document with the product and price IDs
    await db.collection("users").doc(requestData.creatorId).update({
      stripeProductId: product.id,
      stripePriceId: price.id,
      premiumEnabled: true,
      premiumPrice: requestData.priceInDollars,
      paymentMode: requestData.mode,
      premiumUpdatedAt: new Date(),
    })

    console.log(`🏷️ PRODUCT: Updated user document with product and price IDs`)
    console.log("------------ 🏷️ CREATE STRIPE PRODUCT END ------------")

    return NextResponse.json({
      success: true,
      productId: product.id,
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
