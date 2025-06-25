import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST() {
  try {
    console.log("🔧 [Force Setup] Starting forced data creation...")

    // Create test product box with explicit ID
    const productBoxData = {
      title: "Test Product Box",
      description: "This is a test product box for verification testing",
      creatorId: "test-creator-123",
      type: "product_box",
      price: 29.99,
      currency: "usd",
      coverImage: "/placeholder.svg?height=200&width=300&text=Test+Product",
      contentItems: ["test-video.mp4", "test-audio.mp3"],
      createdAt: new Date(),
      status: "active",
    }

    await db.collection("productBoxes").doc("test-product-box-123").set(productBoxData)
    console.log("✅ [Force Setup] Product box created")

    // Create test creator/user with explicit ID
    const creatorData = {
      displayName: "Test Creator",
      username: "testcreator",
      email: "testcreator@example.com",
      stripeAccountId: "acct_test_123456789", // Mock Stripe account
      createdAt: new Date(),
      plan: "creator_pro",
    }

    await db.collection("users").doc("test-creator-123").set(creatorData)
    console.log("✅ [Force Setup] Creator created")

    // Create test user for purchases
    const userData = {
      displayName: "Test User",
      username: "testuser",
      email: "testuser@example.com",
      createdAt: new Date(),
      plan: "free",
    }

    await db.collection("users").doc("test-user-123").set(userData)
    console.log("✅ [Force Setup] User created")

    // Verify the data was created
    const productBoxCheck = await db.collection("productBoxes").doc("test-product-box-123").get()
    const creatorCheck = await db.collection("users").doc("test-creator-123").get()

    console.log("🔍 [Force Setup] Verification - Product box exists:", productBoxCheck.exists)
    console.log("🔍 [Force Setup] Verification - Creator exists:", creatorCheck.exists)

    return NextResponse.json({
      success: true,
      message: "Test data created and verified",
      verification: {
        productBoxExists: productBoxCheck.exists,
        creatorExists: creatorCheck.exists,
        productBoxData: productBoxCheck.exists ? productBoxCheck.data() : null,
        creatorData: creatorCheck.exists ? creatorCheck.data() : null,
      },
    })
  } catch (error) {
    console.error("❌ [Force Setup] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to force create test data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
