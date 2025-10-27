import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { enabled } = await request.json()

    // Get user document
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userSnap.data()
    const subscriptionStatus = userData.subscriptionStatus || "none"
    const hasActiveSubscription = ["active", "trialing"].includes(subscriptionStatus)

    // If trying to enable, check if they have active subscription
    if (enabled && !hasActiveSubscription) {
      return NextResponse.json({ error: "Active subscription required", success: false }, { status: 403 })
    }

    // Update storefront status
    await updateDoc(userRef, {
      isStorefrontEnabled: enabled && hasActiveSubscription,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true, enabled: enabled && hasActiveSubscription })
  } catch (error) {
    console.error("[v0] Error toggling storefront:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
