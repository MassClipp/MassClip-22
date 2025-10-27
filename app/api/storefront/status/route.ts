import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user document
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userSnap.data()

    // Check subscription status
    const subscriptionStatus = userData.subscriptionStatus || "none"
    const hasUsedFreeTrial = userData.hasUsedFreeTrial || false
    const isStorefrontEnabled = userData.isStorefrontEnabled || false

    // User can enable store if they have active subscription or trial
    const hasActiveSubscription = ["active", "trialing"].includes(subscriptionStatus)
    const canEnableStore = hasActiveSubscription

    return NextResponse.json({
      isEnabled: isStorefrontEnabled && hasActiveSubscription,
      hasActiveSubscription,
      hasUsedFreeTrial,
      canEnableStore,
      subscriptionStatus,
    })
  } catch (error) {
    console.error("[v0] Error getting storefront status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
