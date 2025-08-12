import { type NextRequest, NextResponse } from "next/server"
import { ensureMembership } from "@/lib/memberships-service"
import { createFreeUser } from "@/lib/free-users-service"

export async function POST(request: NextRequest) {
  try {
    const { uid, email, username, displayName } = await request.json()

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields: uid and email" }, { status: 400 })
    }

    console.log("🔄 Creating user records for:", { uid, email, username, displayName })

    // Create membership record (handles both free and pro tiers)
    try {
      const membership = await ensureMembership(uid, email)
      console.log("✅ Membership record created/ensured:", membership)
    } catch (error) {
      console.error("❌ Failed to create membership record:", error)
      // Continue with free user creation as fallback
    }

    // Create free user record for tier limitations
    try {
      const freeUser = await createFreeUser(uid, email)
      console.log("✅ Free user record created:", freeUser)
    } catch (error) {
      console.error("❌ Failed to create free user record:", error)
      // Don't fail the entire request for this
    }

    // TODO: Create user profile record if needed
    // This would include username, displayName, etc.

    return NextResponse.json({
      success: true,
      message: "User records created successfully",
      uid,
      email,
    })
  } catch (error: any) {
    console.error("❌ Server-side user creation error:", error)
    return NextResponse.json({ error: "Failed to create user records", details: error.message }, { status: 500 })
  }
}
