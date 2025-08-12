import { type NextRequest, NextResponse } from "next/server"
import { ensureMembership } from "@/lib/memberships-service"

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

    // Create membership record (this will create a free tier membership by default)
    try {
      console.log("🔄 Creating membership record...")
      const membership = await ensureMembership(uid, email)
      console.log("✅ Membership record created/ensured:", {
        uid: membership.uid,
        plan: membership.plan,
        status: membership.status,
        features: membership.features,
      })
    } catch (error) {
      console.error("❌ Failed to create membership record:", error)
      return NextResponse.json(
        {
          error: "Failed to create membership record",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
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
