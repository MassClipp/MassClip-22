import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST() {
  try {
    console.log("🔧 [Setup Test Data] Creating test data...")

    const batch = db.batch()

    // Create test product box
    const productBoxRef = db.collection("productBoxes").doc("test-product-box-123")
    batch.set(productBoxRef, {
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
    })

    // Create test creator/user
    const creatorRef = db.collection("users").doc("test-creator-123")
    batch.set(creatorRef, {
      displayName: "Test Creator",
      username: "testcreator",
      email: "testcreator@example.com",
      stripeAccountId: "acct_test_123456789", // Mock Stripe account
      createdAt: new Date(),
      plan: "creator_pro",
    })

    // Create test user for purchases
    const userRef = db.collection("users").doc("test-user-123")
    batch.set(userRef, {
      displayName: "Test User",
      username: "testuser",
      email: "testuser@example.com",
      createdAt: new Date(),
      plan: "free",
    })

    await batch.commit()

    console.log("✅ [Setup Test Data] Test data created successfully")

    return NextResponse.json({
      success: true,
      message: "Test data created successfully",
      data: {
        productBoxId: "test-product-box-123",
        creatorId: "test-creator-123",
        userId: "test-user-123",
      },
    })
  } catch (error) {
    console.error("❌ [Setup Test Data] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create test data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
