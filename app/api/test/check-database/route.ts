import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET() {
  try {
    console.log("🔍 [Database Check] Starting database check...")

    // Test basic connection
    const testDoc = await db.collection("test").doc("connection").get()
    console.log("✅ [Database Check] Basic connection works")

    // Check if productBoxes collection exists
    const productBoxes = await db.collection("productBoxes").limit(1).get()
    console.log("📦 [Database Check] ProductBoxes collection size:", productBoxes.size)

    // Check specifically for our test product box
    const testProductBox = await db.collection("productBoxes").doc("test-product-box-123").get()
    console.log("🎯 [Database Check] Test product box exists:", testProductBox.exists)

    if (testProductBox.exists) {
      console.log("📋 [Database Check] Test product box data:", testProductBox.data())
    }

    // Check users collection
    const users = await db.collection("users").limit(1).get()
    console.log("👥 [Database Check] Users collection size:", users.size)

    // Check for test creator
    const testCreator = await db.collection("users").doc("test-creator-123").get()
    console.log("👤 [Database Check] Test creator exists:", testCreator.exists)

    if (testCreator.exists) {
      console.log("📋 [Database Check] Test creator data:", testCreator.data())
    }

    return NextResponse.json({
      success: true,
      database: {
        connection: "working",
        productBoxesCount: productBoxes.size,
        testProductBoxExists: testProductBox.exists,
        testProductBoxData: testProductBox.exists ? testProductBox.data() : null,
        usersCount: users.size,
        testCreatorExists: testCreator.exists,
        testCreatorData: testCreator.exists ? testCreator.data() : null,
      },
    })
  } catch (error) {
    console.error("❌ [Database Check] Error:", error)
    return NextResponse.json(
      {
        error: "Database check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
