import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 },
      )
    }

    const results = {
      sessionId,
      userId,
      stripeSession: null as any,
      firestorePurchase: null as any,
      userPurchase: null as any,
      errors: [] as string[],
      recommendations: [] as string[],
    }

    // Check Stripe session
    try {
      results.stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
    } catch (error: any) {
      results.errors.push(`Stripe session error: ${error.message}`)
      results.recommendations.push("Verify the session ID is correct and exists in your Stripe account")
    }

    // Check Firestore purchase record
    try {
      const purchaseDoc = await db.collection("purchases").doc(sessionId).get()
      if (purchaseDoc.exists) {
        results.firestorePurchase = purchaseDoc.data()
      } else {
        results.errors.push("No purchase record found in Firestore")
        results.recommendations.push("Check if webhook processed the purchase or run manual verification")
      }
    } catch (error: any) {
      results.errors.push(`Firestore error: ${error.message}`)
    }

    // Check user's purchase history if userId provided
    if (userId) {
      try {
        const userPurchaseQuery = await db
          .collection("users")
          .doc(userId)
          .collection("purchases")
          .where("sessionId", "==", sessionId)
          .limit(1)
          .get()

        if (!userPurchaseQuery.empty) {
          results.userPurchase = userPurchaseQuery.docs[0].data()
        } else {
          results.errors.push("No purchase record found in user's purchase history")
          results.recommendations.push("User may not have access to purchased content")
        }
      } catch (error: any) {
        results.errors.push(`User purchase lookup error: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
    })
  } catch (error) {
    console.error("Purchase verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed",
      },
      { status: 500 },
    )
  }
}
