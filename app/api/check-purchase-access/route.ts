import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get video ID from query params
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get("videoId")

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId parameter" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Firebase token
    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const uid = decodedToken.uid

    // Check if the user has purchased this video
    // For now, this is a placeholder - you'll need to implement the actual purchase check
    // This could involve checking a purchases collection or subscription status

    // Example: Check if user has an active subscription
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ hasAccess: false })
    }

    const userData = userDoc.data()
    const hasSubscription = userData?.subscriptionStatus === "active" || userData?.plan === "pro"

    // Example: Check if user has purchased this specific video
    const purchaseDoc = await db.collection(`users/${uid}/purchases`).doc(videoId).get()
    const hasPurchased = purchaseDoc.exists

    // Grant access if either condition is met
    const hasAccess = hasSubscription || hasPurchased

    return NextResponse.json({ hasAccess })
  } catch (error) {
    console.error("Error checking purchase access:", error)
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 })
  }
}
