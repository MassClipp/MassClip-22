import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { MembershipService } from "@/lib/membership-service"

export async function GET(request: NextRequest) {
  try {
    const { uid, email } = await getAuthenticatedUser(request.headers)
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ensureMembership will get or create the doc.
    const membership = await MembershipService.ensureMembership(uid, email || "")

    return NextResponse.json(membership)
  } catch (error) {
    console.error("[API /user/membership] Error:", error)
    if (
      error instanceof Error &&
      (error.message.includes("Missing Bearer token") || error.message.includes("Token verification failed"))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
