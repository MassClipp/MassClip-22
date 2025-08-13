import { NextResponse } from "next/server"
import { getAdminDb, initializeFirebaseAdmin, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const PRO_FEATURES = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null,
  maxBundles: null,
}

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json()

    if (!email && !userId) {
      return NextResponse.json({ error: "Email or userId is required" }, { status: 400 })
    }

    // Initialize Firebase
    if (!isFirebaseAdminInitialized()) {
      initializeFirebaseAdmin()
    }

    const db = getAdminDb()
    let targetUserId = userId

    // If no userId provided, look up by email
    if (!targetUserId && email) {
      // Try users collection first
      const usersSnapshot = await db.collection("users").where("email", "==", email).limit(1).get()
      if (!usersSnapshot.empty) {
        targetUserId = usersSnapshot.docs[0].id
      } else {
        // Try freeUsers collection
        const freeUsersSnapshot = await db.collection("freeUsers").where("email", "==", email).limit(1).get()
        if (!freeUsersSnapshot.empty) {
          targetUserId = freeUsersSnapshot.docs[0].data().uid
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create membership
    const membershipData = {
      uid: targetUserId,
      plan: "creator_pro",
      status: "active",
      isActive: true,
      stripeCustomerId: null, // Will be updated when they actually pay
      stripeSubscriptionId: null, // Will be updated when they actually pay
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      priceId: process.env.STRIPE_PRICE_ID || "price_1RuLpLDheyb0pkWF5v2Psykg",
      features: PRO_FEATURES,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      manuallyCreated: true,
      createdBy: "debug-endpoint",
    }

    const docRef = db.collection("memberships").doc(targetUserId)
    await docRef.set(membershipData, { merge: true })

    return NextResponse.json({
      success: true,
      message: `Membership created for user ${targetUserId}`,
      userId: targetUserId,
      membershipData,
    })
  } catch (error: any) {
    console.error("Error creating manual membership:", error)
    return NextResponse.json(
      {
        error: "Failed to create membership",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
