import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔥 [Firebase Test] Testing Firebase connection...")

    // Test environment variables
    const envCheck = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    }

    console.log("🔥 [Firebase Test] Environment variables:", envCheck)

    // Try to import Firebase Admin
    let firebaseStatus = "not_initialized"
    let dbStatus = "not_connected"
    let testWriteStatus = "not_attempted"

    try {
      const { initializeFirebaseAdmin, db } = await import("@/lib/firebase/firebaseAdmin")

      // Initialize Firebase
      initializeFirebaseAdmin()
      firebaseStatus = "initialized"
      console.log("✅ [Firebase Test] Firebase Admin initialized")

      // Test database connection
      const testDoc = await db.collection("test").doc("connection-test").get()
      dbStatus = "connected"
      console.log("✅ [Firebase Test] Database connection successful")

      // Test write operation
      await db.collection("test").doc("connection-test").set({
        timestamp: new Date(),
        test: "connection successful",
      })
      testWriteStatus = "successful"
      console.log("✅ [Firebase Test] Test write successful")
    } catch (firebaseError) {
      console.error("❌ [Firebase Test] Firebase error:", firebaseError)
      return NextResponse.json({
        success: false,
        error: "Firebase connection failed",
        details: firebaseError instanceof Error ? firebaseError.message : "Unknown Firebase error",
        envCheck,
        firebaseStatus,
        dbStatus,
        testWriteStatus,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Firebase connection successful",
      envCheck,
      firebaseStatus,
      dbStatus,
      testWriteStatus,
    })
  } catch (error) {
    console.error("❌ [Firebase Test] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Firebase test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
