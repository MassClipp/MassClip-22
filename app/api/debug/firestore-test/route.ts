import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    console.log("🔍 [Firestore Test] Testing Firestore connection...")

    // Test basic connection
    const testDoc = await db.collection("test").doc("connection-test").get()
    console.log("✅ [Firestore Test] Basic connection successful")

    // Test productBoxes collection access
    const productBoxesSnapshot = await db.collection("productBoxes").limit(1).get()
    console.log("✅ [Firestore Test] ProductBoxes collection accessible")

    // Test users collection access
    const usersSnapshot = await db.collection("users").limit(1).get()
    console.log("✅ [Firestore Test] Users collection accessible")

    return NextResponse.json({
      success: true,
      message: "Firestore connection successful",
      details: {
        basicConnection: true,
        productBoxesAccess: true,
        usersAccess: true,
        productBoxesCount: productBoxesSnapshot.size,
        usersCount: usersSnapshot.size,
      },
    })
  } catch (error) {
    console.error("❌ [Firestore Test] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Firestore connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
