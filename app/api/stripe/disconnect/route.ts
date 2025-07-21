export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    console.log("🔄 Starting Stripe disconnect process...")

    // Step 1: Authentication & Authorization
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Missing or invalid authorization header")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "AUTH_MISSING",
        },
        { status: 401 },
      )
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      console.error("❌ No token provided in authorization header")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication token",
          code: "AUTH_INVALID",
        },
        { status: 401 },
      )
    }

    // Verify Firebase ID token
    let user
    try {
      const { auth } = await import("@/lib/firebase-admin")
      const decodedToken = await auth.verifyIdToken(token)
      user = { uid: decodedToken.uid }
      userId = decodedToken.uid
      console.log(`✅ Authentication successful for user: ${userId}`)
    } catch (authError: any) {
      console.error("❌ Token verification failed:", authError.message)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication token",
          code: "AUTH_TOKEN_INVALID",
          details: authError.message,
        },
        { status: 401 },
      )
    }

    // Step 2: Data Validation & Integrity Checks
    console.log("🔍 Validating user data and Stripe connection...")

    const userDoc = await db.collection("users").doc(user.uid).get()
    if (!userDoc.exists) {
      console.error(`❌ User document not found: ${user.uid}`)
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log(`ℹ️ No Stripe account connected for user: ${user.uid}`)
      return NextResponse.json({
        success: true,
        message: "No Stripe account was connected",
        code: "NO_STRIPE_ACCOUNT",
      })
    }

    console.log(`🔍 Found Stripe account to disconnect: ${stripeAccountId}`)

    // Step 3: Stripe API Integration & Validation
    let stripeAccount = null
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
      console.log(`✅ Stripe account verified: ${stripeAccountId}`, {
        type: stripeAccount.type,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
      })
    } catch (stripeError: any) {
      console.warn(`⚠️ Stripe account not found or inaccessible: ${stripeAccountId}`, stripeError.message)
      // Continue with disconnect even if Stripe account is not accessible
      // This handles cases where the account was deleted externally
    }

    // Step 4: Check for pending transactions (optional - implement based on business logic)
    // For now, we'll proceed with disconnect regardless of pending transactions

    // Step 5: Secure Database Updates using batch operations
    console.log("🔄 Updating database records...")

    const batch = db.batch()
    const userRef = db.collection("users").doc(user.uid)

    // Remove all Stripe-related fields from user document
    const updateData = {
      stripeAccountId: null,
      stripeAccountStatus: null,
      stripeConnectedAt: null,
      stripeOnboardingCompleted: null,
      // Keep audit trail
      stripeDisconnectedAt: new Date(),
      stripeLastDisconnectedAccountId: stripeAccountId,
      updatedAt: new Date(),
    }

    batch.update(userRef, updateData)

    // Step 6: Update associated product boxes to disable payments
    console.log("🔄 Disabling payments on associated product boxes...")

    const productBoxesQuery = await db.collection("productBoxes").where("creatorId", "==", user.uid).get()

    productBoxesQuery.docs.forEach((doc) => {
      batch.update(doc.ref, {
        paymentsEnabled: false,
        stripeProductId: null,
        stripePriceId: null,
        updatedAt: new Date(),
      })
    })

    // Step 7: Create audit log entry
    const auditLogRef = db.collection("auditLogs").doc()
    batch.set(auditLogRef, {
      userId: user.uid,
      action: "stripe_disconnect",
      timestamp: new Date(),
      metadata: {
        disconnectedAccountId: stripeAccountId,
        accountType: stripeAccount?.type || "unknown",
        processingTimeMs: Date.now() - startTime,
        userAgent: request.headers.get("user-agent"),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    })

    // Commit all changes atomically
    await batch.commit()

    const processingTime = Date.now() - startTime
    console.log(`✅ Stripe disconnect completed successfully in ${processingTime}ms for user: ${user.uid}`)

    // Step 8: Return success response
    return NextResponse.json({
      success: true,
      message: "Stripe account disconnected successfully",
      code: "DISCONNECT_SUCCESS",
      metadata: {
        disconnectedAccountId: stripeAccountId,
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error("❌ Stripe disconnect failed:", {
      error: error.message,
      stack: error.stack,
      userId,
      processingTimeMs: processingTime,
    })

    // Log error for monitoring
    try {
      if (userId) {
        await db.collection("errorLogs").add({
          userId,
          action: "stripe_disconnect_failed",
          error: error.message,
          stack: error.stack,
          timestamp: new Date(),
          processingTimeMs: processingTime,
        })
      }
    } catch (logError) {
      console.error("Failed to log error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to disconnect Stripe account",
        code: "DISCONNECT_FAILED",
        details: error.message,
        metadata: {
          processingTimeMs: processingTime,
        },
      },
      { status: 500 },
    )
  }
}
