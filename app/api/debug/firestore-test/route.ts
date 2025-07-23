import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    console.log("🔍 [Firestore Test] Testing Firestore connection...")

    // Test basic Firestore connection by reading a collection
    const testCollection = db.collection("users")
    const snapshot = await testCollection.limit(1).get()

    console.log("✅ [Firestore Test] Successfully connected to Firestore")
    console.log("📊 [Firestore Test] Collection size:", snapshot.size)

    return NextResponse.json({
      success: true,
      message: "Firestore connection successful",
      collectionExists: true,
      documentCount: snapshot.size,
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  } catch (error: any) {
    console.error("❌ [Firestore Test] Connection failed:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to Firestore",
        error: error.message,
        projectId: process.env.FIREBASE_PROJECT_ID,
      },
      { status: 500 },
    )
  }
}
