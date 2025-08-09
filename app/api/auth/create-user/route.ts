import { type NextRequest, NextResponse } from "next/server"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth as clientAuth } from "@/firebase/config"
import { ProfileManager } from "@/lib/profile-manager"
import { MembershipService } from "@/lib/membership-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 User creation request received")

    const { email, password, username, displayName } = await request.json()

    if (!email || !password || !username || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔐 Creating user account for: ${email}`)

    const userCredential = await createUserWithEmailAndPassword(clientAuth, email, password)
    const user = userCredential.user

    console.log(`✅ Firebase user created: ${user.uid}`)

    const profileResult = await ProfileManager.setupCompleteProfile(
      user.uid,
      email,
      displayName,
      user.photoURL || undefined,
    )

    if (!profileResult.success) {
      console.error("❌ Failed to create user profile:", profileResult.error)
    }

    // Ensure membership record is created
    try {
      await MembershipService.ensureMembership(user.uid, email)
      console.log(`✅ [Membership] Created initial 'free' tier record for ${user.uid}`)
    } catch (e) {
      console.warn("⚠️ [Membership] Could not ensure membership record at signup:", e)
    }

    console.log(`✅ User signup completed successfully for: ${username}`)

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: profileResult.username || username,
      },
    })
  } catch (error: any) {
    console.error("❌ Error creating user:", error)

    let errorMessage = "Failed to create account"
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "An account with this email already exists"
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak"
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address"
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
