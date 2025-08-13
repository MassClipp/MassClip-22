import { type NextRequest, NextResponse } from "next/server"
import { adminDb, initializeFirebaseAdmin, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
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

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminInitialized()) {
      initializeFirebaseAdmin()
    }

    const { email, userId } = await request.json()

    if (!email && !userId) {
      return NextResponse.json({ error: "Email or userId required" }, { status: 400 })
    }

    let targetUserId = userId

    // If no userId provided, try to find by email
    if (!targetUserId && email) {
      // Try users collection first
      const usersSnapshot = await adminDb.collection("users").where("email", "==", email).limit(1).get()
      if (!usersSnapshot.empty) {
        targetUserId = usersSnapshot.docs[0].id
      } else {
        // Try freeUsers collection
        const freeUsersSnapshot = await adminDb.collection("freeUsers").where("email", "==", email).limit(1).get()
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
      features: PRO_FEATURES,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // Add some default values
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      priceId: null,
      source: "manual_creation",
    }

    const docRef = adminDb.collection("memberships").doc(targetUserId)
    await docRef.set(membershipData, { merge: true })

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      message: "Membership created successfully",
    })
  } catch (error: any) {
    console.error("Error creating membership:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
