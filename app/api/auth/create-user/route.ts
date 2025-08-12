import { type NextRequest, NextResponse } from "next/server"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase-safe"
import { createFreeUser } from "@/lib/free-users-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 User creation request received")

    // Check if Firebase is properly configured
    if (!auth || !db) {
      console.error("❌ Firebase not properly initialized")
      return NextResponse.json(
        { error: "Authentication service not available. Please check Firebase configuration." },
        { status: 500 },
      )
    }

    const { email, password, username, displayName } = await request.json()

    if (!email || !password || !username || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    console.log(`🔐 Creating user account for: ${email}`)

    // Check if username is already taken
    try {
      const usernameDoc = await getDoc(doc(db, "usernames", username))
      if (usernameDoc.exists()) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 })
      }
    } catch (error) {
      console.error("❌ Error checking username availability:", error)
      return NextResponse.json({ error: "Unable to verify username availability" }, { status: 500 })
    }

    // Create Firebase user
    let userCredential
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      console.error("❌ Firebase user creation error:", error)

      let errorMessage = "Failed to create account"
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address"
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (error.code === "auth/internal-error") {
        errorMessage = "Internal error. Please try again later."
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const user = userCredential.user
    console.log(`✅ Firebase user created: ${user.uid}`)

    // Create user profile
    try {
      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName: displayName || username,
        username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Reserve username
      await setDoc(doc(db, "usernames", username), {
        uid: user.uid,
        createdAt: serverTimestamp(),
      })

      console.log(`✅ User profile created for: ${username}`)
    } catch (error) {
      console.error("❌ Failed to create user profile:", error)
      // Don't fail the entire signup, just log the error
    }

    // Create free user record with limitations
    try {
      await createFreeUser(user.uid, email)
      console.log(`✅ Created free user limitations for: ${user.uid}`)
    } catch (error) {
      console.error("❌ Failed to create free user record:", error)
      // Don't fail signup, but log the error
    }

    console.log(`✅ User signup completed successfully for: ${username}`)

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: username,
      },
    })
  } catch (error: any) {
    console.error("❌ Unexpected error creating user:", error)
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 })
  }
}
