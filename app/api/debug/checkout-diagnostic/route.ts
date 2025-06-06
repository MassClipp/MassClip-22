import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId } = await request.json()

    console.log("🔍 [Diagnostic] Starting checkout diagnostic for:", productBoxId)

    const diagnostics = {
      timestamp: new Date().toISOString(),
      productBoxId,
      checks: {} as any,
      summary: {
        passed: 0,
        failed: 0,
        issues: [] as string[],
      },
    }

    // Check 1: Environment Variables
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY
    const hasFirebaseConfig = !!process.env.FIREBASE_PROJECT_ID

    diagnostics.checks.environment = {
      hasStripeKey,
      stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
      hasFirebaseConfig,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      status: hasStripeKey && hasFirebaseConfig ? "PASS" : "FAIL",
    }

    if (!hasStripeKey) diagnostics.summary.issues.push("Missing STRIPE_SECRET_KEY")
    if (!hasFirebaseConfig) diagnostics.summary.issues.push("Missing Firebase config")

    if (diagnostics.checks.environment.status === "PASS") {
      diagnostics.summary.passed++
    } else {
      diagnostics.summary.failed++
    }

    // Check 2: Stripe Initialization
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20",
      })
      diagnostics.checks.stripe = {
        initialized: true,
        version: "2024-06-20",
        status: "PASS",
      }
      diagnostics.summary.passed++
    } catch (error) {
      diagnostics.checks.stripe = {
        initialized: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: "FAIL",
      }
      diagnostics.summary.failed++
      diagnostics.summary.issues.push("Stripe initialization failed")
    }

    // Check 3: Firestore Connection
    try {
      console.log("🔍 [Diagnostic] Testing Firestore connection...")
      const testDoc = await db.collection("test").doc("connection-test").get()

      diagnostics.checks.firestore = {
        connected: true,
        status: "PASS",
      }
      diagnostics.summary.passed++
      console.log("✅ [Diagnostic] Firestore connection successful")
    } catch (error) {
      console.error("❌ [Diagnostic] Firestore connection failed:", error)
      diagnostics.checks.firestore = {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: "FAIL",
      }
      diagnostics.summary.failed++
      diagnostics.summary.issues.push("Firestore connection failed")

      // If Firestore is down, skip remaining checks
      console.log("📊 [Diagnostic] Summary:", diagnostics.summary)
      return NextResponse.json({
        success: true,
        diagnostics,
      })
    }

    // Check 4: Product Box Data
    try {
      console.log("🔍 [Diagnostic] Fetching product box:", productBoxId)
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

      if (productBoxDoc.exists()) {
        const data = productBoxDoc.data()
        console.log("✅ [Diagnostic] Product box data:", {
          title: data?.title,
          active: data?.active,
          priceId: data?.priceId,
          creatorId: data?.creatorId,
        })

        const hasRequiredFields =
          data?.active && data?.title && typeof data?.price === "number" && data?.priceId && data?.creatorId

        diagnostics.checks.productBox = {
          exists: true,
          active: data?.active,
          hasTitle: !!data?.title,
          hasPrice: typeof data?.price === "number",
          hasPriceId: !!data?.priceId,
          hasCreatorId: !!data?.creatorId,
          type: data?.type,
          priceId: data?.priceId,
          price: data?.price,
          creatorId: data?.creatorId,
          status: hasRequiredFields ? "PASS" : "FAIL",
        }

        if (!data?.active) diagnostics.summary.issues.push("Product box is not active")
        if (!data?.priceId) diagnostics.summary.issues.push("Product box missing Stripe price ID")
        if (!data?.creatorId) diagnostics.summary.issues.push("Product box missing creator ID")

        if (hasRequiredFields) {
          diagnostics.summary.passed++
        } else {
          diagnostics.summary.failed++
        }
      } else {
        console.error("❌ [Diagnostic] Product box not found:", productBoxId)
        diagnostics.checks.productBox = {
          exists: false,
          status: "FAIL",
        }
        diagnostics.summary.failed++
        diagnostics.summary.issues.push("Product box not found")
      }
    } catch (error) {
      console.error("❌ [Diagnostic] Product box access error:", error)

      // Enhanced error logging
      const errorDetails =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack?.split("\n").slice(0, 3).join("\n"),
            }
          : "Unknown error type"

      console.error("❌ [Diagnostic] Detailed error:", errorDetails)

      diagnostics.checks.productBox = {
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.name : "Unknown",
        errorDetails: errorDetails,
        status: "FAIL",
      }
      diagnostics.summary.failed++
      diagnostics.summary.issues.push(
        `Database error accessing product box: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }

    // Check 5: Creator Data
    if (diagnostics.checks.productBox?.exists && diagnostics.checks.productBox?.creatorId) {
      try {
        console.log("🔍 [Diagnostic] Fetching creator:", diagnostics.checks.productBox.creatorId)
        const creatorDoc = await db.collection("users").doc(diagnostics.checks.productBox.creatorId).get()

        if (creatorDoc.exists()) {
          const creatorData = creatorDoc.data()
          const hasStripeAccount = !!creatorData?.stripeAccountId

          console.log("✅ [Diagnostic] Creator data:", {
            username: creatorData?.username,
            hasStripeAccount,
          })

          diagnostics.checks.creator = {
            exists: true,
            hasStripeAccount,
            stripeAccountId: creatorData?.stripeAccountId,
            username: creatorData?.username,
            status: hasStripeAccount ? "PASS" : "FAIL",
          }

          if (!hasStripeAccount) {
            diagnostics.summary.issues.push("Creator not connected to Stripe")
            diagnostics.summary.failed++
          } else {
            diagnostics.summary.passed++
          }
        } else {
          console.error("❌ [Diagnostic] Creator not found:", diagnostics.checks.productBox.creatorId)
          diagnostics.checks.creator = {
            exists: false,
            status: "FAIL",
          }
          diagnostics.summary.failed++
          diagnostics.summary.issues.push("Creator not found")
        }
      } catch (error) {
        console.error("❌ [Diagnostic] Creator access error:", error)
        diagnostics.checks.creator = {
          error: error instanceof Error ? error.message : "Unknown error",
          status: "FAIL",
        }
        diagnostics.summary.failed++
        diagnostics.summary.issues.push("Database error accessing creator")
      }
    }

    // Check 6: Stripe Account Validation
    if (diagnostics.checks.creator?.hasStripeAccount) {
      try {
        console.log("🔍 [Diagnostic] Validating Stripe account:", diagnostics.checks.creator.stripeAccountId)
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2024-06-20",
        })

        const account = await stripe.accounts.retrieve(diagnostics.checks.creator.stripeAccountId)
        const isValid = account.charges_enabled && account.details_submitted

        console.log("✅ [Diagnostic] Stripe account status:", {
          chargesEnabled: account.charges_enabled,
          detailsSubmitted: account.details_submitted,
        })

        diagnostics.checks.stripeAccount = {
          valid: true,
          chargesEnabled: account.charges_enabled,
          detailsSubmitted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled,
          country: account.country,
          type: account.type,
          status: isValid ? "PASS" : "FAIL",
        }

        if (!account.charges_enabled) {
          diagnostics.summary.issues.push("Stripe account charges not enabled")
        }
        if (!account.details_submitted) {
          diagnostics.summary.issues.push("Stripe account details not submitted")
        }

        if (isValid) {
          diagnostics.summary.passed++
        } else {
          diagnostics.summary.failed++
        }
      } catch (error) {
        console.error("❌ [Diagnostic] Stripe account validation error:", error)
        diagnostics.checks.stripeAccount = {
          valid: false,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "FAIL",
        }
        diagnostics.summary.failed++
        diagnostics.summary.issues.push("Stripe account validation failed")
      }
    }

    // Log detailed results
    console.log("✅ [Diagnostic] Completed checkout diagnostic:")
    console.log("📊 Summary:", diagnostics.summary)
    console.log("🔍 Environment:", diagnostics.checks.environment)
    console.log("🔍 Stripe:", diagnostics.checks.stripe)
    console.log("🔍 Firestore:", diagnostics.checks.firestore)
    console.log("🔍 Product Box:", diagnostics.checks.productBox)
    console.log("🔍 Creator:", diagnostics.checks.creator)
    console.log("🔍 Stripe Account:", diagnostics.checks.stripeAccount)

    return NextResponse.json({
      success: true,
      diagnostics,
    })
  } catch (error) {
    console.error("❌ [Diagnostic] Error:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
