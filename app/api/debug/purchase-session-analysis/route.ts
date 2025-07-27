import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Session Analysis] Starting comprehensive analysis...")

    const body = await request.json()
    const { sessionId, userId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("📊 [Session Analysis] Analyzing session:", sessionId)
    console.log("👤 [Session Analysis] User ID:", userId)

    const analysis = {
      sessionId,
      sessionExists: false,
      sessionDetails: null,
      stripeError: null,
      firestorePurchase: null,
      userAccess: null,
      recommendations: [] as string[],
      errors: [] as string[],
      debugInfo: {
        timestamp: new Date().toISOString(),
        stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
        sessionIdPrefix: sessionId.substring(0, 8),
        userId,
      },
    }

    // 1. Check Stripe Session
    console.log("💳 [Session Analysis] Checking Stripe session...")
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })

      analysis.sessionExists = true
      analysis.sessionDetails = {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        created: session.created,
        expires_at: session.expires_at,
        metadata: session.metadata,
        customer_details: session.customer_details,
        mode: session.mode,
        payment_intent: session.payment_intent,
      }

      console.log("✅ [Session Analysis] Stripe session found")
      console.log("   Payment Status:", session.payment_status)
      console.log("   Session Status:", session.status)
      console.log("   Amount:", session.amount_total)
      console.log("   Metadata:", session.metadata)

      // Analyze session status
      if (session.payment_status !== "paid") {
        analysis.errors.push(`Payment status is '${session.payment_status}', expected 'paid'`)
        analysis.recommendations.push("Check if the customer completed the payment process")
      }

      if (session.status !== "complete") {
        analysis.errors.push(`Session status is '${session.status}', expected 'complete'`)
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        analysis.errors.push("Session has expired")
        analysis.recommendations.push("Sessions expire after 24 hours. Customer needs to make a new purchase.")
      }

      // Check metadata
      if (!session.metadata?.productBoxId && !session.metadata?.bundleId) {
        analysis.errors.push("No product or bundle ID found in session metadata")
        analysis.recommendations.push("Ensure checkout session is created with proper metadata")
      }

      // Check mode consistency
      const sessionIsLive = sessionId.startsWith("cs_live_")
      const apiIsLive = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
      if (sessionIsLive !== apiIsLive) {
        analysis.errors.push(
          `Mode mismatch: Session is ${sessionIsLive ? "live" : "test"} but API is ${apiIsLive ? "live" : "test"}`,
        )
        analysis.recommendations.push("Ensure you're using the correct Stripe keys for your environment")
      }
    } catch (error: any) {
      console.error("❌ [Session Analysis] Stripe error:", error)
      analysis.stripeError = {
        type: error.type,
        message: error.message,
        code: error.code,
      }

      if (error.type === "StripeInvalidRequestError") {
        if (error.message?.includes("No such checkout.session")) {
          analysis.errors.push("Session does not exist in Stripe")
          analysis.recommendations.push("Verify the session ID is correct and hasn't been deleted")
          analysis.recommendations.push("Check if you're using the correct Stripe account/mode")
        }
      } else {
        analysis.errors.push(`Stripe API error: ${error.message}`)
        analysis.recommendations.push("Check your Stripe API configuration and network connectivity")
      }
    }

    // 2. Check Firestore Purchase Record
    console.log("🔥 [Session Analysis] Checking Firestore purchase record...")
    try {
      const purchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

      if (!purchaseQuery.empty) {
        const purchaseDoc = purchaseQuery.docs[0]
        analysis.firestorePurchase = {
          id: purchaseDoc.id,
          ...purchaseDoc.data(),
        }
        console.log("✅ [Session Analysis] Firestore purchase found:", purchaseDoc.id)
      } else {
        console.log("❌ [Session Analysis] No Firestore purchase record found")
        analysis.errors.push("No purchase record found in Firestore")
        analysis.recommendations.push("Purchase may not have been processed by webhook")
        analysis.recommendations.push("Check webhook logs and ensure webhook endpoint is accessible")
      }
    } catch (error: any) {
      console.error("❌ [Session Analysis] Firestore error:", error)
      analysis.errors.push(`Firestore error: ${error.message}`)
      analysis.recommendations.push("Check Firestore connection and permissions")
    }

    // 3. Check User Access (if userId provided)
    if (userId) {
      console.log("👤 [Session Analysis] Checking user access...")
      try {
        const userDoc = await db.collection("users").doc(userId).get()

        if (userDoc.exists) {
          const userData = userDoc.data()
          const productBoxAccess = userData?.productBoxAccess || {}
          const bundleAccess = userData?.bundleAccess || {}

          // Check if user has access to the item from this session
          if (analysis.sessionDetails?.metadata) {
            const { productBoxId, bundleId } = analysis.sessionDetails.metadata
            let hasAccess = false

            if (productBoxId && productBoxAccess[productBoxId]) {
              hasAccess = true
              analysis.userAccess = {
                type: "product_box",
                itemId: productBoxId,
                ...productBoxAccess[productBoxId],
              }
            } else if (bundleId && bundleAccess[bundleId]) {
              hasAccess = true
              analysis.userAccess = {
                type: "bundle",
                itemId: bundleId,
                ...bundleAccess[bundleId],
              }
            }

            if (!hasAccess) {
              analysis.errors.push("User does not have access to the purchased item")
              analysis.recommendations.push("Access may not have been granted after purchase")
              analysis.recommendations.push("Check if the purchase completion process ran successfully")
            } else {
              console.log("✅ [Session Analysis] User has access to item")
            }
          }

          // Check user's purchase history
          const userPurchasesQuery = await db
            .collection("users")
            .doc(userId)
            .collection("purchases")
            .where("sessionId", "==", sessionId)
            .limit(1)
            .get()

          if (userPurchasesQuery.empty) {
            analysis.errors.push("No purchase record found in user's purchase history")
            analysis.recommendations.push("Purchase may not have been added to user's account")
          }
        } else {
          analysis.errors.push("User document not found")
          analysis.recommendations.push("Ensure user account exists and is properly configured")
        }
      } catch (error: any) {
        console.error("❌ [Session Analysis] User access error:", error)
        analysis.errors.push(`User access check error: ${error.message}`)
      }
    } else {
      analysis.recommendations.push("Provide user ID for complete access analysis")
    }

    // 4. Additional Checks
    console.log("🔍 [Session Analysis] Running additional checks...")

    // Check webhook configuration
    try {
      const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 })
      const hasWebhook = webhookEndpoints.data.some((webhook) =>
        webhook.url.includes(process.env.NEXT_PUBLIC_SITE_URL || ""),
      )

      if (!hasWebhook) {
        analysis.errors.push("No webhook endpoint configured for this domain")
        analysis.recommendations.push("Configure Stripe webhook to handle payment events")
      }
    } catch (error) {
      console.log("⚠️ [Session Analysis] Could not check webhook configuration")
    }

    // Generate final recommendations
    if (analysis.errors.length === 0) {
      analysis.recommendations.push("✅ No issues detected with this session")
    } else {
      analysis.recommendations.push("🔧 Review the errors above and follow the specific recommendations")
    }

    console.log("✅ [Session Analysis] Analysis complete")
    console.log("   Errors found:", analysis.errors.length)
    console.log("   Recommendations:", analysis.recommendations.length)

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error("❌ [Session Analysis] Analysis failed:", error)
    return NextResponse.json(
      {
        error: "Analysis failed",
        details: error.message,
        sessionId: body.sessionId,
      },
      { status: 500 },
    )
  }
}
