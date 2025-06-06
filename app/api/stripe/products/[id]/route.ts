import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getServerSession } from "@/lib/server-session"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, active } = await request.json()
    const productId = params.id

    // Get user's Stripe account ID
    const userDoc = await getDoc(doc(db, "users", session.uid))
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Stripe account not connected" }, { status: 400 })
    }

    // Update product in Stripe
    const product = await stripe.products.update(
      productId,
      {
        name,
        description,
        active,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const productId = params.id

    // Get user's Stripe account ID
    const userDoc = await getDoc(doc(db, "users", session.uid))
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Stripe account not connected" }, { status: 400 })
    }

    // Archive product in Stripe (can't delete, only archive)
    const product = await stripe.products.update(
      productId,
      {
        active: false,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Error archiving product:", error)
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 })
  }
}
