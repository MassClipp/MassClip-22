import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Test API] Starting comprehensive API test...")

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
    }

    // Test 1: Firebase Admin connection
    try {
      console.log("🔍 [Test API] Testing Firebase Admin connection...")
      const testDoc = await db.collection("test").doc("connection").get()
      results.tests.firebaseAdmin = {
        success: true,
        message: "Firebase Admin connected successfully",
      }
      console.log("✅ [Test API] Firebase Admin connection successful")
    } catch (error: any) {
      results.tests.firebaseAdmin = {
        success: false,
        error: error.message,
        code: error.code,
      }
      console.error("❌ [Test API] Firebase Admin connection failed:", error)
    }

    // Test 2: Check bundlePurchases collection
    try {
      console.log("🔍 [Test API] Testing bundlePurchases collection...")
      const purchasesSnapshot = await db.collection("bundlePurchases").limit(5).get()
      results.tests.bundlePurchasesCollection = {
        success: true,
        documentCount: purchasesSnapshot.size,
        message: `Found ${purchasesSnapshot.size} documents in bundlePurchases`,
      }

      if (purchasesSnapshot.size > 0) {
        const samplePurchases: any[] = []
        purchasesSnapshot.forEach((doc) => {
          const data = doc.data()
          samplePurchases.push({
            id: doc.id,
            buyerUid: data.buyerUid,
            title: data.title,
            amount: data.amount,
          })
        })
        results.tests.bundlePurchasesCollection.sampleData = samplePurchases
      }
      console.log("✅ [Test API] bundlePurchases collection accessible")
    } catch (error: any) {
      results.tests.bundlePurchasesCollection = {
        success: false,
        error: error.message,
        code: error.code,
      }
      console.error("❌ [Test API] bundlePurchases collection test failed:", error)
    }

    // Test 3: Test query with where clause
    try {
      console.log("🔍 [Test API] Testing where query...")
      const testQuery = await db.collection("bundlePurchases").where("buyerUid", "==", "test-user-id").limit(1).get()
      results.tests.whereQuery = {
        success: true,
        message: "Where query executed successfully",
        resultCount: testQuery.size,
      }
      console.log("✅ [Test API] Where query successful")
    } catch (error: any) {
      results.tests.whereQuery = {
        success: false,
        error: error.message,
        code: error.code,
      }
      console.error("❌ [Test API] Where query failed:", error)
    }

    // Test 4: Test orderBy query
    try {
      console.log("🔍 [Test API] Testing orderBy query...")
      const orderQuery = await db.collection("bundlePurchases").orderBy("purchasedAt", "desc").limit(1).get()
      results.tests.orderByQuery = {
        success: true,
        message: "OrderBy query executed successfully",
        resultCount: orderQuery.size,
      }
      console.log("✅ [Test API] OrderBy query successful")
    } catch (error: any) {
      results.tests.orderByQuery = {
        success: false,
        error: error.message,
        code: error.code,
      }
      console.error("❌ [Test API] OrderBy query failed:", error)
    }

    // Test 5: Test combined where + orderBy query (the actual query used)
    try {
      console.log("🔍 [Test API] Testing combined where + orderBy query...")
      const combinedQuery = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", "test-user-id")
        .orderBy("purchasedAt", "desc")
        .limit(1)
        .get()
      results.tests.combinedQuery = {
        success: true,
        message: "Combined where + orderBy query executed successfully",
        resultCount: combinedQuery.size,
      }
      console.log("✅ [Test API] Combined query successful")
    } catch (error: any) {
      results.tests.combinedQuery = {
        success: false,
        error: error.message,
        code: error.code,
      }
      console.error("❌ [Test API] Combined query failed:", error)

      // Check if it's an index error
      if (error.code === "failed-precondition" || error.message?.includes("index")) {
        results.tests.combinedQuery.indexRequired = true
        results.tests.combinedQuery.indexUrl = `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`
      }
    }

    // Test 6: List all collections
    try {
      console.log("🔍 [Test API] Listing all collections...")
      const collections = await db.listCollections()
      const collectionNames = collections.map((col) => col.id)
      results.tests.collections = {
        success: true,
        collections: collectionNames,
        bundlePurchasesExists: collectionNames.includes("bundlePurchases"),
      }
      console.log("✅ [Test API] Collections listed successfully")
    } catch (error: any) {
      results.tests.collections = {
        success: false,
        error: error.message,
      }
      console.error("❌ [Test API] Collections listing failed:", error)
    }

    // Overall status
    const failedTests = Object.values(results.tests).filter((test: any) => !test.success)
    results.overallStatus = {
      success: failedTests.length === 0,
      totalTests: Object.keys(results.tests).length,
      failedTests: failedTests.length,
      message: failedTests.length === 0 ? "All tests passed" : `${failedTests.length} tests failed`,
    }

    console.log("📊 [Test API] Test completed:", results.overallStatus)

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("❌ [Test API] Test suite failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Test suite failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
