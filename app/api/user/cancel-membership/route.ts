import { type NextRequest, NextResponse } from "next/server"
import { cancelMembership } from "@/lib/memberships-service"
import { verifyIdToken } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const uid = decodedToken.uid

    await cancelMembership(uid)

    return NextResponse.json({
      success: true,
      message: "Membership cancelled successfully. You will now use free tier limitations.",
    })
  } catch (error) {
    console.error("❌ Error cancelling membership:", error)
    return NextResponse.json({ error: "Failed to cancel membership" }, { status: 500 })
  }
}
