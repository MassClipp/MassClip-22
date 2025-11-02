import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
})

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching eBooks")

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    let ebooksSnapshot
    try {
      ebooksSnapshot = await adminDb
        .collection("ebooks")
        .where("creatorId", "==", uid)
        .orderBy("createdAt", "desc")
        .get()
    } catch (indexError) {
      console.log("[v0] Index not available, fetching without orderBy")
      ebooksSnapshot = await adminDb.collection("ebooks").where("creatorId", "==", uid).get()
    }

    const ebooks = ebooksSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    ebooks.sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return bTime - aTime
    })

    console.log(`[v0] Found ${ebooks.length} eBooks for user ${uid}`)

    return NextResponse.json({ ebooks })
  } catch (error) {
    console.error("[v0] Error fetching eBooks:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch eBooks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Creating new eBook")

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const { title, description, pageCount, price } = body

    console.log("[v0] Request body:", { title, description, pageCount, price })

    if (!title) {
      return NextResponse.json({ error: "Title is required", details: "Title is required" }, { status: 400 })
    }

    if (!price || price < 0.5) {
      return NextResponse.json({ error: "Invalid price", details: "Price must be at least $0.50" }, { status: 400 })
    }

    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()
    let stripeAccountId = userData?.stripeAccountId

    console.log("[v0] Checking users collection for Stripe account:", stripeAccountId)

    // If not found in users collection, check connectedStripeAccounts collection
    if (!stripeAccountId) {
      console.log("[v0] Checking connectedStripeAccounts collection...")
      const connectedAccountDoc = await adminDb.collection("connectedStripeAccounts").doc(uid).get()

      if (connectedAccountDoc.exists) {
        const connectedAccount = connectedAccountDoc.data()
        stripeAccountId = connectedAccount?.stripeAccountId || connectedAccount?.stripe_user_id
        console.log("[v0] Found Stripe account in connectedStripeAccounts:", stripeAccountId)
      }
    }

    if (!stripeAccountId) {
      console.log("[v0] No Stripe account found for user")
      return NextResponse.json(
        {
          error: "Stripe account not connected",
          details: "Please connect your Stripe account in Settings before creating paid eBooks.",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Verifying Stripe account status...")
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)
      console.log("[v0] Stripe account status:", {
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      })

      if (!account.charges_enabled) {
        return NextResponse.json(
          {
            error: "Stripe account not ready",
            details: "Your Stripe account cannot accept payments yet. Please complete your Stripe onboarding.",
          },
          { status: 400 },
        )
      }
    } catch (verifyError) {
      console.error("[v0] Stripe account verification error:", verifyError)
      return NextResponse.json(
        {
          error: "Stripe verification failed",
          details: "Failed to verify Stripe account. Please reconnect your Stripe account in Settings.",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Creating Stripe product...")
    let product
    let stripePrice
    try {
      product = await stripe.products.create(
        {
          name: title,
          description: description || undefined,
          metadata: {
            type: "ebook",
            creator_id: uid,
          },
        },
        {
          stripeAccount: stripeAccountId,
        },
      )
      console.log("[v0] Stripe product created:", product.id)

      stripePrice = await stripe.prices.create(
        {
          product: product.id,
          unit_amount: Math.round(price * 100),
          currency: "usd",
          metadata: {
            type: "ebook",
            creator_id: uid,
          },
        },
        {
          stripeAccount: stripeAccountId,
        },
      )
      console.log("[v0] Stripe price created:", stripePrice.id)
    } catch (stripeError) {
      console.error("[v0] Stripe error:", stripeError)
      return NextResponse.json(
        {
          error: "Stripe error",
          details:
            stripeError instanceof Error
              ? stripeError.message
              : "Failed to create Stripe product. Please check your Stripe account connection.",
        },
        { status: 500 },
      )
    }

    const ebookData = {
      creatorId: uid,
      title,
      description: description || "",
      coverUrl: "",
      pageCount: pageCount || 0,
      pages: [],
      status: "draft",
      price: price,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const ebookRef = await adminDb.collection("ebooks").add(ebookData)

    console.log(`[v0] eBook created successfully: ${ebookRef.id}`)

    return NextResponse.json({
      ebookId: ebookRef.id,
      message: "eBook created successfully",
    })
  } catch (error) {
    console.error("[v0] Error creating eBook:", error)
    return NextResponse.json(
      {
        error: "Failed to create eBook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
