import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { v4 as uuidv4 } from "uuid"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

// Platform fee percentage (20%)
const PLATFORM_FEE_PERCENTAGE = 20

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get("Authorization")
    let userId = ""

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]
      try {
        const decodedToken = await auth.verifyIdToken(token)
        userId = decodedToken.uid
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    } else {
      // Try to get the session cookie
      const sessionCookie = request.cookies.get("__session")?.value

      if (sessionCookie) {
        try {
          const decodedCookie = await auth.verifySessionCookie(sessionCookie)
          userId = decodedCookie.uid
        } catch (error) {
          return NextResponse.json({ error: "Invalid session" }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
    }

    // Parse the request body
    const { clipId, creatorId, price } = await request.json()

    if (!clipId || !creatorId || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the clip exists
    const clipDoc = await db.collection("clips").doc(clipId).get()

    if (!clipDoc.exists) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 })
    }

    const clip = clipDoc.data()

    if (!clip?.isPublished) {
      return NextResponse.json({ error: "Clip is not available for purchase" }, { status: 400 })
    }

    if (clip.creatorId !== creatorId) {
      return NextResponse.json({ error: "Invalid creator ID" }, { status: 400 })
    }

    // Check if the user already purchased this clip
    const purchaseDoc = await db
      .collection("purchases")
      .where("userId", "==", userId)
      .where("clipId", "==", clipId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!purchaseDoc.empty) {
      return NextResponse.json({ error: "You already purchased this clip" }, { status: 400 })
    }

    // Get creator name for the checkout page
    const creatorDoc = await db.collection("users").doc(creatorId).get()
    const creatorName = creatorDoc.exists ? creatorDoc.data()?.displayName || "Creator" : "Creator"

    // Calculate platform fee (20% of price)
    const priceInCents = Math.round(price * 100) // Convert to cents
    const platformFeeInCents = Math.round(priceInCents * (PLATFORM_FEE_PERCENTAGE / 100))

    // Create a new purchase record
    const purchaseId = uuidv4()
    const purchaseRef = db.collection("purchases").doc(purchaseId)

    await purchaseRef.set({
      id: purchaseId,
      userId,
      creatorId,
      clipId,
      amount: price,
      platformFee: platformFeeInCents / 100, // Convert back to dollars for storage
      currency: "usd",
      status: "pending",
      purchaseDate: new Date(),
    })

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: clip.title,
              description: `Premium clip by ${creatorName}`,
              images: clip.thumbnailUrl ? [clip.thumbnailUrl] : [],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: creatorId, // This assumes the creator ID is a Stripe account ID
        },
      },
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/purchased-clips?success=true&clip=${clipId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorDoc.data()?.username || creatorId}`,
      metadata: {
        purchaseId,
        clipId,
        creatorId,
        userId,
      },
    })

    // Update the purchase record with the session ID
    await purchaseRef.update({
      checkoutSessionId: session.id,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 },
    )
  }
}
