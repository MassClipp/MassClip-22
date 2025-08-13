import { type NextRequest, NextResponse } from "next/server"
import { auth, adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
import { setCreatorPro } from "@/lib/memberships-service"

export async function POST(request: NextRequest) {
  try {
    const { email, stripeCustomerId, stripeSubscriptionId } = await request.json()

    if (!isFirebaseAdminInitialized()) {
      return NextResponse.json(
        {
          error: "Firebase Admin not initialized",
        },
        { status: 500 },
      )
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required",
        },
        { status: 400 },
      )
    }

    // Look up user by email
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
    } catch (error) {
      return NextResponse.json(
        {
          error: `User not found with email: ${email}`,
        },
        { status: 404 },
      )
    }

    const uid = userRecord.uid

    // Create the membership using the service
    await setCreatorPro(uid, {
      email: email,
      stripeCustomerId: stripeCustomerId || "manual_creation",
      stripeSubscriptionId: stripeSubscriptionId || "manual_creation",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: "active",
    })

    // Verify the membership was created
    const membershipDoc = await adminDb.collection("memberships").doc(uid).get()

    return NextResponse.json({
      success: true,
      uid: uid,
      email: email,
      membershipCreated: membershipDoc.exists,
      membershipData: membershipDoc.exists ? membershipDoc.data() : null,
    })
  } catch (error) {
    console.error("Error creating manual membership:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
