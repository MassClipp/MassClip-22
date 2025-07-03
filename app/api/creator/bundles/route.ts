import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

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

export async function GET(req: NextRequest) {
  console.log("🔍 [Creator Bundles] GET request received")

  try {
    // Get auth token
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Creator Bundles] Missing authorization header")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`✅ [Creator Bundles] User authenticated: ${userId}`)

    // Fetch bundles for this creator
    const bundlesSnapshot = await db.collection("bundles").where("creatorId", "==", userId).get()

    const bundles = bundlesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ [Creator Bundles] Found ${bundles.length} bundles for creator ${userId}`)

    return NextResponse.json({
      bundles,
      success: true,
    })
  } catch (error) {
    console.error("❌ [Creator Bundles] Error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  console.log("🔄 [Creator Bundles] POST request received")

  try {
    // Get auth token
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Creator Bundles] Missing authorization header")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`✅ [Creator Bundles] User authenticated: ${userId}`)

    // Parse request body
    const body = await req.json()
    const { title, description, price, currency = "usd", type = "one_time" } = body

    // Validate required fields
    if (!title || !price || price < 0.5) {
      return new NextResponse("Invalid bundle data", { status: 400 })
    }

    // Get creator data to check Stripe account
    const creatorDoc = await db.collection("users").doc(userId).get()
    if (!creatorDoc.exists) {
      return new NextResponse("Creator not found", { status: 404 })
    }

    const creatorData = creatorDoc.data()
    const hasStripeAccount = !!creatorData?.stripeAccountId

    console.log(`🔍 [Creator Bundles] Creator has Stripe account: ${hasStripeAccount}`)

    // Create bundle document
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number.parseFloat(price),
      currency,
      type,
      creatorId: userId,
      active: true,
      contentItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // If creator has Stripe account, create Stripe product and price
    if (hasStripeAccount) {
      try {
        // Create Stripe product on creator's connected account
        const stripeProduct = await stripe.products.create(
          {
            name: title.trim(),
            description: description?.trim() || `Premium content by ${creatorData.username || "Creator"}`,
            metadata: {
              creatorId: userId,
              bundleType: type,
            },
          },
          {
            stripeAccount: creatorData.stripeAccountId,
          },
        )

        // Create Stripe price on creator's connected account
        const stripePrice = await stripe.prices.create(
          {
            unit_amount: Math.round(Number.parseFloat(price) * 100),
            currency,
            product: stripeProduct.id,
            metadata: {
              creatorId: userId,
              bundleType: type,
            },
          },
          {
            stripeAccount: creatorData.stripeAccountId,
          },
        )

        // Add Stripe IDs to bundle data
        bundleData.productId = stripeProduct.id
        bundleData.priceId = stripePrice.id

        console.log(`✅ [Creator Bundles] Created Stripe product: ${stripeProduct.id} and price: ${stripePrice.id}`)
      } catch (stripeError) {
        console.error("❌ [Creator Bundles] Stripe error:", stripeError)
        // Continue without Stripe integration - can be added later
      }
    }

    // Save bundle to Firestore
    const bundleRef = await db.collection("bundles").add(bundleData)

    console.log(`✅ [Creator Bundles] Bundle created: ${bundleRef.id}`)

    return NextResponse.json({
      success: true,
      bundleId: bundleRef.id,
      message: "Bundle created successfully",
      bundle: {
        id: bundleRef.id,
        ...bundleData,
      },
    })
  } catch (error) {
    console.error("❌ [Creator Bundles] Error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
