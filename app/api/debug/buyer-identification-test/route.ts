import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { testBuyerUid, testProductBoxId, testSessionId } = await request.json()

    console.log("🧪 [Buyer ID Test] Testing buyer identification system:", {
      testBuyerUid,
      testProductBoxId,
      testSessionId,
    })

    const results = {
      buyerUidProvided: !!testBuyerUid,
      productBoxIdProvided: !!testProductBoxId,
      sessionIdProvided: !!testSessionId,
      tests: [] as any[],
    }

    // Test 1: Check if buyer UID is in purchases collection
    if (testBuyerUid && testProductBoxId) {
      try {
        const purchasesQuery = await db
          .collection("purchases")
          .where("buyerUid", "==", testBuyerUid)
          .where("productBoxId", "==", testProductBoxId)
          .get()

        results.tests.push({
          test: "purchases_collection_buyer_uid_check",
          passed: !purchasesQuery.empty,
          count: purchasesQuery.size,
          details: purchasesQuery.empty ? "No purchases found" : "Purchases found with buyer UID",
        })
      } catch (error) {
        results.tests.push({
          test: "purchases_collection_buyer_uid_check",
          passed: false,
          error: error.message,
        })
      }
    }

    // Test 2: Check session metadata for buyer UID
    if (testSessionId) {
      try {
        const sessionDoc = await db.collection("purchases").doc(testSessionId).get()
        const hasSession = sessionDoc.exists
        const sessionData = hasSession ? sessionDoc.data() : null
        const hasBuyerUid = sessionData?.buyerUid === testBuyerUid

        results.tests.push({
          test: "session_metadata_buyer_uid_check",
          passed: hasSession && hasBuyerUid,
          sessionExists: hasSession,
          buyerUidMatches: hasBuyerUid,
          sessionBuyerUid: sessionData?.buyerUid,
          expectedBuyerUid: testBuyerUid,
        })
      } catch (error) {
        results.tests.push({
          test: "session_metadata_buyer_uid_check",
          passed: false,
          error: error.message,
        })
      }
    }

    // Test 3: Check bundlePurchases collection
    if (testBuyerUid && testProductBoxId) {
      try {
        const bundlePurchasesQuery = await db
          .collection("bundlePurchases")
          .where("buyerUid", "==", testBuyerUid)
          .where("productBoxId", "==", testProductBoxId)
          .get()

        results.tests.push({
          test: "bundle_purchases_buyer_uid_check",
          passed: !bundlePurchasesQuery.empty,
          count: bundlePurchasesQuery.size,
        })
      } catch (error) {
        results.tests.push({
          test: "bundle_purchases_buyer_uid_check",
          passed: false,
          error: error.message,
        })
      }
    }

    // Test 4: Check user's personal purchases
    if (testBuyerUid && testBuyerUid !== "anonymous" && testProductBoxId) {
      try {
        const userPurchasesQuery = await db
          .collection("users")
          .doc(testBuyerUid)
          .collection("purchases")
          .where("productBoxId", "==", testProductBoxId)
          .get()

        results.tests.push({
          test: "user_personal_purchases_check",
          passed: !userPurchasesQuery.empty,
          count: userPurchasesQuery.size,
        })
      } catch (error) {
        results.tests.push({
          test: "user_personal_purchases_check",
          passed: false,
          error: error.message,
        })
      }
    }

    // Test 5: Comprehensive buyer identification validation
    const identificationScore = results.tests.filter((test) => test.passed).length
    const totalTests = results.tests.length
    const identificationStrength = totalTests > 0 ? (identificationScore / totalTests) * 100 : 0

    results.summary = {
      identificationScore,
      totalTests,
      identificationStrength: `${identificationStrength.toFixed(1)}%`,
      recommendation:
        identificationStrength >= 75
          ? "Strong buyer identification - access should be granted"
          : identificationStrength >= 50
            ? "Moderate buyer identification - additional verification recommended"
            : "Weak buyer identification - access should be denied",
    }

    console.log("✅ [Buyer ID Test] Test completed:", results.summary)

    return NextResponse.json(results)
  } catch (error) {
    console.error("❌ [Buyer ID Test] Error:", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
