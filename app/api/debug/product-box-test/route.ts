import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { productBoxId, action } = await request.json()

    console.log(`🔍 [Product Box Test] Action: ${action}, Product Box: ${productBoxId}, User: ${userId}`)

    if (action === "fetch") {
      try {
        // Test fetching the product box document
        const productBoxRef = db.collection("productBoxes").doc(productBoxId)
        const productBoxDoc = await productBoxRef.get()

        const debugInfo = {
          documentExists: productBoxDoc.exists,
          documentId: productBoxDoc.id,
          documentRef: productBoxRef.path,
          hasData: !!productBoxDoc.data(),
        }

        if (productBoxDoc.exists) {
          const data = productBoxDoc.data()
          debugInfo.data = data
          debugInfo.fields = Object.keys(data || {})
          debugInfo.active = data?.active
          debugInfo.creatorId = data?.creatorId
          debugInfo.price = data?.price
          debugInfo.currency = data?.currency
        }

        // Also test creator access
        if (productBoxDoc.exists && productBoxDoc.data()?.creatorId) {
          const creatorId = productBoxDoc.data()!.creatorId
          const creatorRef = db.collection("users").doc(creatorId)
          const creatorDoc = await creatorRef.get()

          debugInfo.creator = {
            exists: creatorDoc.exists,
            hasStripeAccount: !!creatorDoc.data()?.stripeAccountId,
            stripeAccountId: creatorDoc.data()?.stripeAccountId,
          }
        }

        return NextResponse.json({
          success: true,
          data: debugInfo,
        })
      } catch (error) {
        console.error("❌ [Product Box Test] Firestore error:", error)
        return NextResponse.json({
          success: false,
          error: "Firestore access error",
          details: error instanceof Error ? error.message : "Unknown error",
          errorType: error?.constructor?.name,
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action",
    })
  } catch (error) {
    console.error("❌ [Product Box Test] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
