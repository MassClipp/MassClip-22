import { type NextRequest, NextResponse } from "next/server"
import { deleteMembership } from "@/lib/memberships-service"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Delete membership record - user falls back to freeUsers limits
    await deleteMembership(uid)

    return NextResponse.json({
      success: true,
      message: "Membership canceled, reverted to free tier",
    })
  } catch (error) {
    console.error("Error canceling membership:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
