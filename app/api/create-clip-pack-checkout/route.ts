import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { v4 as uuidv4 } from "uuid"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

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
    const { clipPackId, creatorId, price } = await request.json()

    if (!clipPackId || !creatorId || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the clip pack exists and is published
    const clipPackDoc = await db.collection("clipPacks").doc(clipPackId).get()

    if (!clipPackDoc.exists) {
      return NextResponse.json({ error: "Clip pack not found" }, { status: 404 })
    }

    const clipPack = clipPackDoc.data()

    if (!clipPack?.isPublished) {
      return NextResponse.json({ error: "Clip pack is not available for purchase" }, { status: 400 })
    }

    if (clipPack.creatorId !== creatorId) {
      return NextResponse.json({ error: "Invalid creator ID" }, { status: 400 })
    }

    // Check if the user already purchased this clip pack
    const purchaseDoc = await db
      .collection("purchases")
      .where("userId", "==", userId)
      .where("clipPackId", "==", clipPackId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!purchaseDoc.empty) {
      return NextResponse.json({ error: "You already purchased this clip pack" }, { status: 400 })
    }

    // Create a new purchase record
    const purchaseId = uuidv4()
    const purchaseRef = db.collection("purchases").doc(purchaseId)

    await purchaseRef.set({
      id: purchaseId,
      userId,
      creatorId,
      clipPackId,
      amount: price,
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
              name: clipPack.title,
              description: clipPack.description || "Clip Pack",
              images: clipPack.coverImage ? [clipPack.coverImage] : [],
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/clip-pack/${clipPackId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/clip-pack/${clipPackId}`,
      metadata: {
        purchaseId,
        clipPackId,
        creatorId,
        userId,
      },
    })

    // Update the purchase record with the session ID
    await purchaseRef.update({
      checkoutSessionId: session.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 },
    )
  }
}
