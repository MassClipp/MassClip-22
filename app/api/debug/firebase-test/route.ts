import { type NextRequest, NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase-server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  console.log("🔍 Testing Firebase connection...")

  try {
    // Test Firebase Admin initialization
    const { app, db } = getFirebaseAdmin()

    if (!app) {
      return NextResponse.json({
        success: false,
        error: "Firebase Admin app not initialized",
      })
    }

    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Firebase Admin database not initialized",
      })
    }

    console.log("✅ Firebase Admin app and database initialized")

    // Test a simple query
    try {
      console.log("🔍 Testing Firestore query...")
      const testCollection = db.collection("test")
      const testQuery = await testCollection.limit(1).get()

      console.log(`✅ Test query successful, found ${testQuery.size} documents`)

      return NextResponse.json({
        success: true,
        message: "Firebase connection successful",
        details: {
          appInitialized: !!app,
          dbInitialized: !!db,
          queryWorking: true,
          testCollectionSize: testQuery.size,
        },
      })
    } catch (queryError) {
      console.error("❌ Test query failed:", queryError)
      return NextResponse.json({
        success: false,
        error: "Query failed",
        details: {
          name: queryError.name,
          message: queryError.message,
          code: queryError.code,
        },
      })
    }
  } catch (error) {
    console.error("❌ Firebase test failed:", error)
    return NextResponse.json({
      success: false,
      error: "Firebase initialization failed",
      details: {
        name: error.name,
        message: error.message,
      },
    })
  }
}
