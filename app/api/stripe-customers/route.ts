import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Get all users with stripeCustomerId
    const usersSnapshot = await db.collection("users").where("stripeCustomerId", "!=", null).get()

    const customers = usersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        userId: doc.id,
        email: data.email,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        subscriptionStatus: data.subscriptionStatus,
        plan: data.plan,
        subscriptionUpdatedAt: data.subscriptionUpdatedAt,
      }
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("Error fetching stripe customers:", error)
    return NextResponse.json({ error: "Failed to fetch stripe customers" }, { status: 500 })
  }
}
