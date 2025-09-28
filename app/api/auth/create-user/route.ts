import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb, FieldValue } from "@/lib/firebase-admin"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { uid, email, username, displayName } = body

    // Verify the token UID matches the request UID
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: "Token mismatch" }, { status: 403 })
    }

    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()

    // Create user profile
    const userProfile = {
      uid,
      email,
      username: username || "",
      displayName: displayName || "",
      role: "user",
      plan: "free",
      permissions: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isActive: true,
      emailVerified: decodedToken.email_verified || false,
      profile: {
        avatar: "",
        bio: "",
        website: "",
        location: "",
        socialLinks: {},
      },
      settings: {
        notifications: {
          email: true,
          push: true,
          marketing: false,
        },
        privacy: {
          profilePublic: false,
          showEmail: false,
        },
      },
      subscription: {
        status: "free",
        plan: "free",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      usage: {
        storageUsed: 0,
        uploadsThisMonth: 0,
        downloadsThisMonth: 0,
      },
    }

    // Save user profile
    await db.collection("users").doc(uid).set(userProfile, { merge: true })

    // Reserve username if provided
    if (username) {
      try {
        await db.collection("usernames").doc(username).set({
          uid,
          createdAt: now,
        })
      } catch (error) {
        console.error("Error reserving username:", error)
        // Don't fail the entire operation if username reservation fails
      }
    }

    // Create user analytics document
    await db.collection("analytics").doc(uid).set({
      uid,
      totalViews: 0,
      totalDownloads: 0,
      totalEarnings: 0,
      createdAt: now,
      updatedAt: now,
    })

    console.log("✅ User profile created successfully:", uid)

    return NextResponse.json({
      success: true,
      message: "User profile created successfully",
      user: {
        uid,
        email,
        username,
        displayName,
        role: "user",
        plan: "free",
      },
    })
  } catch (error) {
    console.error("❌ Error creating user profile:", error)
    return NextResponse.json(
      {
        error: "Failed to create user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
