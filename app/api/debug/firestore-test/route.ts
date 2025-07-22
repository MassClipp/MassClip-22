import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    console.log("🔍 [Test Firestore] Testing Firestore connection...")

    // Test basic Firestore connection
    const testCollection = db.collection("_test")
    const testDoc = testCollection.doc("connection-test")

    // Write test data
    const testData = {
      timestamp: new Date().toISOString(),
      test: true,
      message: "Firestore connection test",
      source: "massclip_diagnostic",
    }

    await testDoc.set(testData)
    console.log("✅ [Test Firestore] Successfully wrote test document")

    // Read test data back
    const readDoc = await testDoc.get()
    if (!readDoc.exists) {
      throw new Error("Test document was not found after writing")
    }

    const readData = readDoc.data()
    console.log("✅ [Test Firestore] Successfully read test document")

    // Clean up test document
    await testDoc.delete()
    console.log("✅ [Test Firestore] Successfully deleted test document")

    // Test users collection access
    let usersCollectionTest = null
    try {
      const usersSnapshot = await db.collection("users").limit(1).get()
      usersCollectionTest = {
        accessible: true,
        documentCount: usersSnapshot.size,
        hasDocuments: !usersSnapshot.empty,
      }
      console.log("✅ [Test Firestore] Users collection accessible")
    } catch (usersError: any) {
      console.warn("⚠️ [Test Firestore] Users collection test failed:", usersError.message)
      usersCollectionTest = {
        accessible: false,
        error: usersError.message,
      }
    }

    return NextResponse.json({
      success: true,
      message: "Firestore connection successful",
      testData: readData,
      usersCollection: usersCollectionTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ [Test Firestore] Connection failed:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Firestore connection failed",
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: 500 },
    )
  }
}
