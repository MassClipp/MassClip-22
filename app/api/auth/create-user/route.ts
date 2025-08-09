import { type NextRequest, NextResponse } from "next/server"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth as clientAuth } from "@/firebase/config"
import { ProfileManager } from "@/lib/profile-manager"
import { MembershipService } from "@/lib/membership-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 [create-user] Received request")

    const body = await request.json()
    const { email, password, username, displayName } = body

    if (!email || !password || !username || !displayName) {
      console.error("❌ [create-user] Missing required fields in request body:", body)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔐 [create-user] Attempting to create Firebase Auth user for: ${email}`)

    // 1. Create user in Firebase Authentication using the client SDK
    const userCredential = await createUserWithEmailAndPassword(clientAuth, email, password)
    const user = userCredential.user
    console.log(`✅ [create-user] Firebase Auth user created successfully. UID: ${user.uid}`)

    // 2. Create the user's profile document in Firestore
    try {
      console.log(`🔄 [create-user] Creating user profile for UID: ${user.uid}`)
      const profileResult = await ProfileManager.setupCompleteProfile(
        user.uid,
        email,
        displayName,
        user.photoURL || undefined,
      )
      if (profileResult.success) {
        console.log(`✅ [create-user] User profile created successfully for UID: ${user.uid}`)
      } else {
        // Log error but don't fail the entire signup
        console.error(`⚠️ [create-user] Failed to create user profile for UID: ${user.uid}`, profileResult.error)
      }
    } catch (profileError) {
      console.error(`❌ [create-user] CRITICAL: Error during profile creation for UID: ${user.uid}`, profileError)
    }

    // 3. Create the essential 'free' tier membership document
    try {
      console.log(`🔄 [create-user] Ensuring membership document exists for UID: ${user.uid}`)
      await MembershipService.ensureMembership(user.uid, email)
      console.log(`✅ [create-user] Membership document ensured for UID: ${user.uid}`)
    } catch (membershipError) {
      console.error(
        `❌ [create-user] CRITICAL: Failed to create membership document for UID: ${user.uid}`,
        membershipError,
      )
      // This is a critical failure, but we won't block the user from signing in.
      // The system should be resilient enough to create it on their next action.
    }

    console.log(`✅ [create-user] Signup process completed for UID: ${user.uid}`)

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
      },
    })
  } catch (error: any) {
    console.error("❌ [create-user] Top-level error during user creation:", error)

    let errorMessage = "Failed to create account. Please try again."
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "An account with this email already exists."
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak. It must be at least 6 characters long."
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "The email address is not valid."
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
