import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user document
    const userDoc = await db.collection("users").doc(session.user.email).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user document to remove Stripe connection
    await db.collection("users").doc(session.user.email).update({
      stripeAccountId: null,
      stripeConnected: false,
      stripeOnboardingComplete: false,
      updatedAt: new Date().toISOString(),
    })

    // Log the disconnection
    console.log(`Stripe account disconnected for user: ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: "Stripe account successfully disconnected",
    })
  } catch (error) {
    console.error("Error disconnecting Stripe account:", error)
    return NextResponse.json({ error: "Failed to disconnect Stripe account" }, { status: 500 })
  }
}
