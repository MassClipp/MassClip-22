import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const { uid, email } = await request.json()

    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

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

    // Also create a usernames document for reference
    await db.collection("usernames").doc(sampleUsername).set({
      uid: uid,
      createdAt: new Date(),
    })

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
    return NextResponse.json(
      {
        error: "Failed to create sample profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
