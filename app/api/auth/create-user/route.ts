import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { ProfileManager } from "@/lib/profile-manager"
import { MembershipService } from "@/lib/membership-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 [create-user v2] Admin SDK route received request")

    const body = await request.json()
    const { email, password, username, displayName } = body

    if (!email || !password || !username || !displayName) {
      console.error("❌ [create-user v2] Missing required fields in request body:", body)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔐 [create-user v2] Attempting to create user for: ${email} using Admin SDK`)

    // 1. Create user directly with the Firebase Admin SDK
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    })
    const { uid } = userRecord
    console.log(`✅ [create-user v2] Firebase Auth user created successfully. UID: ${uid}`)

    // 2. Create the user's profile document in Firestore
    try {
      console.log(`🔄 [create-user v2] Creating user profile for UID: ${uid}`)
      const profileResult = await ProfileManager.setupCompleteProfile(uid, email, displayName)
      if (profileResult.success) {
        console.log(`✅ [create-user v2] User profile created successfully for UID: ${uid}`)
      } else {
        console.error(`⚠️ [create-user v2] Failed to create user profile for UID: ${uid}`, profileResult.error)
      }
    } catch (profileError) {
      console.error(`❌ [create-user v2] CRITICAL: Error during profile creation for UID: ${uid}`, profileError)
    }

    // 3. Create the essential 'free' tier membership document
    try {
      console.log(`🔄 [create-user v2] Ensuring membership document exists for UID: ${uid}`)
      await MembershipService.ensureMembership(uid, email)
      console.log(`✅ [create-user v2] Membership document ensured for UID: ${uid}`)
    } catch (membershipError) {
      console.error(
        `❌ [create-user v2] CRITICAL: Failed to create membership document for UID: ${uid}`,
        membershipError,
      )
    }

    console.log(`✅ [create-user v2] Signup process completed for UID: ${uid}`)

    // Note: We don't return a user credential here because the admin SDK doesn't sign the user in.
    // The client will need to call signInWithEmailAndPassword after this succeeds.
    return NextResponse.json({
      success: true,
      uid: uid,
    })
  } catch (error: any) {
    console.error("❌ [create-user v2] Top-level error during user creation:", error)

    let errorMessage = "Failed to create account. Please try again."
    if (error.code === "auth/email-already-exists") {
      errorMessage = "An account with this email already exists."
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak. It must be at least 6 characters long."
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "The email address is not valid."
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
