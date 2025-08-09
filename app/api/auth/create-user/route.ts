import { type NextRequest, NextResponse } from "next/server"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { ProfileManager } from "@/lib/profile-manager"
import { UserTrackingService } from "@/lib/user-tracking-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 User creation request received")

    const { email, password, username, displayName } = await request.json()

    if (!email || !password || !username || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔐 Creating user account for: ${email}`)

    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    console.log(`✅ Firebase user created: ${user.uid}`)

    // Create complete profile using ProfileManager
    const profileResult = await ProfileManager.setupCompleteProfile(
      user.uid,
      email,
      displayName,
      user.photoURL || undefined,
    )

    if (!profileResult.success) {
      console.error("❌ Failed to create user profile:", profileResult.error)
      // Don't fail the entire signup, just log the error
    }

    // Ensure freeUsers tracking exists for all non-Creator Pro users
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || ""
      await UserTrackingService.ensureFreeUserForNonPro(user.uid, user.email || "", {
        ipAddress: ip || undefined,
      })
    } catch (e) {
      // Don't block signup on tracking errors; just log
      console.warn("⚠️ [UserTracking] Could not ensure free user record at signup:", e)
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
