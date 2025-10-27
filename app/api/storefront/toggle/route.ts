import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { getStripeSubscriptionStatus } from "@/lib/stripe-subscription-service"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { enabled } = await request.json()

    // Check subscription status
    const subscriptionStatus = await getStripeSubscriptionStatus(userId)
    const hasActiveSubscription = subscriptionStatus.isActive

    // If trying to enable, check if user has active subscription
    if (enabled && !hasActiveSubscription) {
      return NextResponse.json({ error: "Active subscription required" }, { status: 403 })
    }

    // Update storefront status in users collection
    await adminDb.collection("users").doc(userId).update({
      storefrontEnabled: enabled,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("Error toggling storefront:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
