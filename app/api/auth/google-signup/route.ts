import { type NextRequest, NextResponse } from "next/server"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"
import { createFreeUser } from "@/lib/free-users-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Google signup user profile creation request received")

    if (!db) {
      console.error("❌ Firestore not properly initialized")
      return NextResponse.json({ error: "Database service not available" }, { status: 500 })
    }

    const { uid, email, displayName, username } = await request.json()

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔐 Creating user profile for Google signup: ${email}`)

    // Check if user profile already exists
    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      console.log(`✅ User profile already exists for: ${uid}`)
      return NextResponse.json({ success: true, message: "User profile already exists" })
    }

    // Generate username if not provided
    const finalUsername = username || email.split("@")[0] || "user"

    // Check if username is already taken
    try {
      const usernameDoc = await getDoc(doc(db, "usernames", finalUsername))
      if (usernameDoc.exists()) {
        // Generate a unique username by appending a number
        let counter = 1
        let uniqueUsername = `${finalUsername}${counter}`

        while (true) {
          const uniqueUsernameDoc = await getDoc(doc(db, "usernames", uniqueUsername))
          if (!uniqueUsernameDoc.exists()) {
            break
          }
          counter++
          uniqueUsername = `${finalUsername}${counter}`
        }

        // Use the unique username
        await createUserProfile(uid, email, displayName, uniqueUsername)
      } else {
        // Username is available
        await createUserProfile(uid, email, displayName, finalUsername)
      }
    } catch (error) {
      console.error("❌ Error checking username availability:", error)
      // Use a fallback username
      const fallbackUsername = `user_${uid.substring(0, 8)}`
      await createUserProfile(uid, email, displayName, fallbackUsername)
    }

    // Create free user record with limitations
    try {
      await createFreeUser(uid, email)
      console.log(`✅ Created free user limitations for Google signup: ${uid}`)
    } catch (error) {
      console.error("❌ Failed to create free user record for Google signup:", error)
      // Don't fail the entire process, just log the error
    }

    console.log(`✅ Google signup user profile completed successfully for: ${email}`)

    return NextResponse.json({
      success: true,
      message: "User profile created successfully",
    })
  } catch (error: any) {
    console.error("❌ Unexpected error creating Google signup user profile:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

async function createUserProfile(uid: string, email: string, displayName: string | null, username: string) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  // Create user profile
  await setDoc(doc(db, "users", uid), {
    email,
    displayName: displayName || username,
    username,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Reserve username
  await setDoc(doc(db, "usernames", username), {
    uid: uid,
    createdAt: serverTimestamp(),
  })

  console.log(`✅ User profile created for Google signup: ${username}`)
}
