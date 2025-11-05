import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { PLAN_NAMES } from "@/lib/plan-config"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Fetch user's membership from Firestore
    const membershipDoc = await db.collection("memberships").doc(uid).get()

    if (!membershipDoc.exists) {
      return NextResponse.json({
        plan: "free",
        isActive: false,
        status: "inactive",
      })
    }

    const membershipData = membershipDoc.data()

    // Normalize plan name to match PLAN_NAMES constants
    let plan = membershipData?.plan || "free"

    // Map any legacy plan names to standardized names
    if (plan === "faceless_pro" || plan === "pro") {
      plan = PLAN_NAMES.STARTER
    } else if (plan === "facelessprenuer") {
      plan = PLAN_NAMES.CREATOR_PRO
    }

    console.log("[v0] membership-status - User:", uid, "Plan:", plan, "Raw plan:", membershipData?.plan)

    return NextResponse.json({
      plan,
      isActive: membershipData?.isActive || false,
      status: membershipData?.status || "inactive",
      cancelAtPeriodEnd: membershipData?.cancelAtPeriodEnd || false,
      currentPeriodEnd: membershipData?.currentPeriodEnd,
      stripeSubscriptionId: membershipData?.stripeSubscriptionId,
    })
  } catch (error) {
    console.error("[v0] membership-status - Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
