import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  console.log("🔧 [Debug Purchases API] Starting comprehensive test...")

  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      passed: 0,
      failed: 0,
      total: 0,
    },
  }

  // Test 1: Firebase Admin Connection
  try {
    console.log("🔍 Test 1: Firebase Admin Connection")
    const testDoc = await db.collection("_test").limit(1).get()
    results.tests.push({
      name: "Firebase Admin Connection",
      status: "PASS",
      message: "Successfully connected to Firestore",
      details: { connectionTest: true },
    })
    results.summary.passed++
  } catch (error: any) {
    console.error("❌ Test 1 Failed:", error)
    results.tests.push({
      name: "Firebase Admin Connection",
      status: "FAIL",
      message: error.message,
      details: { error: error.code },
    })
    results.summary.failed++
  }
  results.summary.total++

  // Test 2: bundlePurchases Collection Access
  try {
    console.log("🔍 Test 2: bundlePurchases Collection Access")
    const collectionRef = db.collection("bundlePurchases")
    const snapshot = await collectionRef.limit(1).get()
    results.tests.push({
      name: "bundlePurchases Collection Access",
      status: "PASS",
      message: `Collection accessible, contains ${snapshot.size} documents (limited to 1)`,
      details: { collectionExists: true, documentCount: snapshot.size },
    })
    results.summary.passed++
  } catch (error: any) {
    console.error("❌ Test 2 Failed:", error)
    results.tests.push({
      name: "bundlePurchases Collection Access",
      status: "FAIL",
      message: error.message,
      details: { error: error.code },
    })
    results.summary.failed++
  }
  results.summary.total++

  // Test 3: Sample Query (Simple)
  try {
    console.log("🔍 Test 3: Simple Query Test")
    const snapshot = await db.collection("bundlePurchases").limit(5).get()
    const sampleData = snapshot.docs.map((doc) => ({
      id: doc.id,
      buyerUid: doc.data().buyerUid,
      title: doc.data().title,
      purchasedAt: doc.data().purchasedAt ? "present" : "missing",
    }))

    results.tests.push({
      name: "Simple Query Test",
      status: "PASS",
      message: `Successfully queried collection, found ${snapshot.size} documents`,
      details: { documentCount: snapshot.size, sampleData },
    })
    results.summary.passed++
  } catch (error: any) {
    console.error("❌ Test 3 Failed:", error)
    results.tests.push({
      name: "Simple Query Test",
      status: "FAIL",
      message: error.message,
      details: { error: error.code },
    })
    results.summary.failed++
  }
  results.summary.total++

  // Test 4: Index-Required Query
  const testUserId = "test-user-id"
  try {
    console.log("🔍 Test 4: Index-Required Query")
    const snapshot = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", testUserId)
      .orderBy("purchasedAt", "desc")
      .limit(1)
      .get()

    results.tests.push({
      name: "Index-Required Query (buyerUid + purchasedAt)",
      status: "PASS",
      message: "Query executed successfully - index exists",
      details: { indexExists: true, documentCount: snapshot.size },
    })
    results.summary.passed++
  } catch (error: any) {
    console.error("❌ Test 4 Failed:", error)
    const isIndexError = error.code === "failed-precondition" || error.message?.includes("index")

    results.tests.push({
      name: "Index-Required Query (buyerUid + purchasedAt)",
      status: "FAIL",
      message: isIndexError ? "Missing Firestore index" : error.message,
      details: {
        error: error.code,
        isIndexError,
        indexUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`,
        requiredIndex: {
          collection: "bundlePurchases",
          fields: [
            { fieldPath: "buyerUid", order: "ASCENDING" },
            { fieldPath: "purchasedAt", order: "DESCENDING" },
          ],
        },
      },
    })
    results.summary.failed++
  }
  results.summary.total++

  // Test 5: Fallback Query (without ordering)
  try {
    console.log("🔍 Test 5: Fallback Query Test")
    const snapshot = await db.collection("bundlePurchases").where("buyerUid", "==", testUserId).limit(5).get()

    results.tests.push({
      name: "Fallback Query (without ordering)",
      status: "PASS",
      message: "Fallback query works - can fetch purchases without index",
      details: { documentCount: snapshot.size },
    })
    results.summary.passed++
  } catch (error: any) {
    console.error("❌ Test 5 Failed:", error)
    results.tests.push({
      name: "Fallback Query (without ordering)",
      status: "FAIL",
      message: error.message,
      details: { error: error.code },
    })
    results.summary.failed++
  }
  results.summary.total++

  // Test 6: Check for actual user purchases
  const searchParams = request.nextUrl.searchParams
  const realUserId = searchParams.get("userId")
  if (realUserId) {
    try {
      console.log("🔍 Test 6: Real User Purchases")
      const snapshot = await db.collection("bundlePurchases").where("buyerUid", "==", realUserId).get()

      results.tests.push({
        name: `Real User Purchases (${realUserId})`,
        status: "PASS",
        message: `Found ${snapshot.size} purchases for user`,
        details: {
          userId: realUserId,
          purchaseCount: snapshot.size,
          purchases: snapshot.docs.slice(0, 3).map((doc) => ({
            id: doc.id,
            title: doc.data().title,
            amount: doc.data().amount,
            purchasedAt: doc.data().purchasedAt ? "present" : "missing",
          })),
        },
      })
      results.summary.passed++
    } catch (error: any) {
      console.error("❌ Test 6 Failed:", error)
      results.tests.push({
        name: `Real User Purchases (${realUserId})`,
        status: "FAIL",
        message: error.message,
        details: { error: error.code, userId: realUserId },
      })
      results.summary.failed++
    }
    results.summary.total++
  }

  console.log("✅ [Debug Purchases API] Tests completed:", results.summary)

  return NextResponse.json(results)
}
