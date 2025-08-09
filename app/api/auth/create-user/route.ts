import { type NextRequest, NextResponse } from "next/server"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth as clientAuth } from "@/firebase/config"

// This endpoint can remain on the edge or node, as it no longer uses the Admin SDK.
// We'll keep it as nodejs for consistency.
export const runtime = "nodejs"

async function triggerPostSignupSetup(uid: string, email: string, displayName: string, photoURL?: string) {
  const absoluteUrl = new URL("/api/user/post-signup-setup", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

  try {
    // This is a "fire-and-forget" call. We don't wait for it to complete
    // to ensure the user's signup process is fast. The backend will handle it.
    fetch(absoluteUrl.href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, email, displayName, photoURL: photoURL || null }),
    })
    console.log(`[create-user] Triggered post-signup setup for UID: ${uid}`)
  } catch (error) {
    console.error(`[create-user] Failed to trigger post-signup setup for UID: ${uid}`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 [create-user] Received request")
    const body = await request.json()
    const { email, password, username, displayName } = body

    if (!email || !password || !username || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(clientAuth, email, password)
    const user = userCredential.user
    console.log(`✅ [create-user] Firebase Auth user created successfully. UID: ${user.uid}`)

    // 2. Trigger the separate, reliable backend process to set up database documents
    await triggerPostSignupSetup(user.uid, email, displayName, user.photoURL || undefined)

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
      errorMessage = "Password is too weak."
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "The email address is not valid."
    }
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
