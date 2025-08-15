import { type NextRequest, NextResponse } from "next/server"
import { ensureMembership } from "@/lib/memberships-service"
import { createFreeUser } from "@/lib/free-users-service"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Server-side user creation API called")

    const { uid, email, username, displayName } = await request.json()

    if (!uid || !email) {
      console.error("❌ Missing required fields:", { uid: !!uid, email: !!email })
      return NextResponse.json({ error: "Missing required fields: uid and email" }, { status: 400 })
    }

    console.log("🔄 Creating user records for:", {
      uid: uid.substring(0, 8) + "...",
      email,
      username,
      displayName,
    })

    // Create freeUsers record first (this is what tracks free tier limitations)
    try {
      console.log("🔄 Creating freeUsers record...")
      const freeUser = await createFreeUser(uid, email)
      console.log("✅ FreeUsers record created successfully:", {
        uid: freeUser.uid,
        email: freeUser.email,
        downloadsUsed: freeUser.downloadsUsed,
        bundlesCreated: freeUser.bundlesCreated,
      })
    } catch (error) {
      console.error("❌ Failed to create freeUsers record:", error)
      return NextResponse.json(
        {
          error: "Failed to create freeUsers record",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Also create membership record for consistency
    try {
      console.log("🔄 Creating membership record...")
      const membership = await ensureMembership(uid, email)
      console.log("✅ Membership record created/ensured:", {
        uid: membership.uid,
        plan: membership.plan,
        status: membership.status,
      })
    } catch (error) {
      console.error("❌ Failed to create membership record:", error)
      // Don't fail the entire request if membership fails, since freeUsers is the primary tracker
      console.warn("⚠️ Continuing despite membership error since freeUsers was created successfully")
    }

    console.log("✅ Server-side user creation completed successfully")

    return NextResponse.json({
      success: true,
      message: "User records created successfully",
      uid,
      email,
    })
  } catch (error: any) {
    console.error("❌ Server-side user creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create user records",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
