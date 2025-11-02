import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"
import Stripe from "stripe"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("🔍 [Stripe Diagnostic] Running diagnostics for user:", userId)

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    // Check if Stripe account exists
    if (!stripeAccountId) {
      return NextResponse.json({
        success: false,
        status: "not_connected",
        message: "Stripe account not connected",
        details: "You need to connect your Stripe account before syncing products",
        nextSteps: [
          "Go to Dashboard > Settings > Stripe",
          "Click 'Connect with Stripe'",
          "Complete the onboarding process",
        ],
      })
    }

    // Check Stripe account status
    let accountStatus
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      accountStatus = {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          disabled_reason: account.requirements?.disabled_reason,
        },
        capabilities: account.capabilities || {},
      }

      console.log("✅ [Stripe Diagnostic] Account retrieved:", accountStatus)
    } catch (error: any) {
      console.error("❌ [Stripe Diagnostic] Error retrieving account:", error)

      return NextResponse.json({
        success: false,
        status: "retrieval_error",
        message: "Error retrieving Stripe account",
        error: error.message,
        stripeAccountId: stripeAccountId,
        nextSteps: [
          "Check if your Stripe account is still active",
          "Reconnect your Stripe account",
          "Contact support if the issue persists",
        ],
      })
    }

    // Get unsynced product boxes
    const unsyncedSnapshot = await db
      .collection("productBoxes")
      .where("creatorId", "==", userId)
      .where("productId", "==", null)
      .get()

    const unsyncedBoxes = unsyncedSnapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title,
      price: doc.data().price,
      stripeStatus: doc.data().stripeStatus || "pending",
      stripeError: doc.data().stripeError || null,
    }))

    // Test Stripe API with a simple operation
    let apiTest = { success: false, message: "" }
    try {
      // Just list a single product to test API access
      await stripe.products.list({ limit: 1 }, { stripeAccount: stripeAccountId })
      apiTest = { success: true, message: "Successfully connected to Stripe API" }
    } catch (error: any) {
      apiTest = {
        success: false,
        message: "Failed to connect to Stripe API",
        error: error.message,
        code: error.code || error.type,
      }
    }

    // Compile diagnostic results
    const diagnosticResults = {
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        uid: userId,
        email: userData.email,
        username: userData.username,
      },
      stripe: {
        accountId: stripeAccountId,
        accountStatus,
        apiTest,
        canAcceptPayments: accountStatus.charges_enabled,
        readyForSync: accountStatus.charges_enabled && apiTest.success,
        blockers: !accountStatus.charges_enabled
          ? ["charges_not_enabled"]
          : !apiTest.success
            ? ["api_connection_failed"]
            : [],
      },
      products: {
        unsyncedCount: unsyncedBoxes.length,
        unsyncedBoxes: unsyncedBoxes,
      },
      nextSteps: [],
    }

    // Add next steps based on diagnostic results
    if (!accountStatus.charges_enabled) {
      diagnosticResults.nextSteps.push(
        "Complete your Stripe account verification",
        "Submit any pending verification documents",
        "Check your email for Stripe verification requests",
      )
    }

    if (!apiTest.success) {
      diagnosticResults.nextSteps.push(
        "Check your internet connection",
        "Verify your Stripe API keys",
        "Reconnect your Stripe account",
      )
    }

    if (accountStatus.charges_enabled && apiTest.success && unsyncedBoxes.length > 0) {
      diagnosticResults.nextSteps.push(
        "Use the 'Sync All' button to sync your products",
        "Check the browser console for any errors during sync",
      )
    }

    return NextResponse.json(diagnosticResults)
  } catch (error: any) {
    console.error("❌ [Stripe Diagnostic] Error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Diagnostic failed",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
