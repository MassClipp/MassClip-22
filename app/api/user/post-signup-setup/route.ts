import { type NextRequest, NextResponse } from "next/server"
import { ProfileManager } from "@/lib/profile-manager"
import { MembershipService } from "@/lib/membership-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  // This is an internal endpoint, consider adding a secret or some form of auth
  // if it needs to be protected from public access.
  try {
    const body = await request.json()
    const { uid, email, displayName, photoURL } = body

    if (!uid || !email || !displayName) {
      return NextResponse.json({ error: "Missing required user data" }, { status: 400 })
    }

    console.log(`[post-signup-setup] Received request for UID: ${uid}`)

    // Using Promise.all to run setup tasks concurrently
    const [profileResult, membershipResult] = await Promise.allSettled([
      ProfileManager.setupCompleteProfile(uid, email, displayName, photoURL),
      MembershipService.ensureMembership(uid, email),
    ])

    if (profileResult.status === "rejected") {
      console.error(`❌ [post-signup-setup] Failed to create profile for ${uid}:`, profileResult.reason)
    } else {
      console.log(`✅ [post-signup-setup] Profile setup successful for ${uid}.`)
    }

    if (membershipResult.status === "rejected") {
      console.error(`❌ [post-signup-setup] Failed to create membership for ${uid}:`, membershipResult.reason)
    } else {
      console.log(`✅ [post-signup-setup] Membership setup successful for ${uid}.`)
    }

    // Check if either failed to return a partial success/failure response
    if (profileResult.status === "rejected" || membershipResult.status === "rejected") {
      return NextResponse.json(
        {
          success: false,
          message: "One or more post-signup tasks failed. Check server logs.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, message: "Post-signup setup complete." })
  } catch (error: any) {
    console.error("❌ [post-signup-setup] Unhandled error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
