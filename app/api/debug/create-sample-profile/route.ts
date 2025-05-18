import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract and verify the token
    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Check if user already has a profile
    const existingProfile = await db.collection("creatorProfiles").doc(uid).get()

    if (existingProfile.exists) {
      // Return the existing profile data
      const profileData = existingProfile.data()
      return NextResponse.json({
        success: true,
        message: "Profile already exists",
        profile: {
          ...profileData,
          id: existingProfile.id,
          username: profileData?.username || "sample_user",
        },
      })
    }

    // Generate a unique username
    const timestamp = Date.now()
    const sampleUsername = `demo_user_${timestamp}`

    // Create a sample profile
    const sampleProfile = {
      username: sampleUsername,
      displayName: "Demo Creator",
      bio: "This is a sample creator profile for demonstration purposes.",
      socialLinks: {
        instagram: "demo_creator",
        twitter: "demo_creator",
        youtube: "DemoCreator",
        website: "https://example.com",
      },
      profileImage: "/abstract-profile.png",
      coverImage: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: true,
    }

    // Save the sample profile
    await db.collection("creatorProfiles").doc(uid).set(sampleProfile)

    return NextResponse.json({
      success: true,
      message: "Sample profile created",
      profile: {
        ...sampleProfile,
        id: uid,
        username: sampleUsername,
      },
    })
  } catch (error) {
    console.error("Error creating sample profile:", error)
    return NextResponse.json({ error: "Failed to create sample profile" }, { status: 500 })
  }
}
