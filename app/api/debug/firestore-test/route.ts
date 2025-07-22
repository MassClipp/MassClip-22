import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    console.log("🔧 [Test Firestore] Testing Firestore connection...")

    // Test basic read access
    const testDoc = await db.collection("test").doc("connection-test").get()
    console.log("✅ [Test Firestore] Read access successful")

    // Test write access
    await db.collection("test").doc("connection-test").set({
      timestamp: new Date().toISOString(),
      test: "Firestore connection test",
      status: "success",
    })
    console.log("✅ [Test Firestore] Write access successful")

    // Test collection listing
    const collections = await db.listCollections()
    const collectionNames = collections.map((col) => col.id)
    console.log("✅ [Test Firestore] Collections found:", collectionNames)

    return NextResponse.json({
      success: true,
      message: "Firestore connection successful",
      collections: collectionNames,
      testDocExists: testDoc.exists,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ [Test Firestore] Firestore connection failed:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Firestore connection failed",
        error: error.message,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
