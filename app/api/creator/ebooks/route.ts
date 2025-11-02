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

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!price || price < 0.5) {
      return NextResponse.json({ error: "Price must be at least $0.50" }, { status: 400 })
    }

    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Stripe account not connected. Please connect your Stripe account first." },
        { status: 400 },
      )
    }

    const product = await stripe.products.create(
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

    const stripePrice = await stripe.prices.create(
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
