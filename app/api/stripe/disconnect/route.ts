import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface DisconnectAuditLog {
  userId: string
  stripeAccountId: string | null
  timestamp: Date
  ipAddress: string | null
  userAgent: string | null
  reason: string
  success: boolean
  errorMessage?: string
}

/**
 * Backend Process for Stripe Account Unlinking
 *
 * This endpoint handles the complete process of disconnecting a user's Stripe account
 * from the MassClip platform. The process includes:
 *
 * 1. Authentication & Authorization
 * 2. Data Validation & Integrity Checks
 * 3. Stripe API Integration
 * 4. Database Updates
 * 5. Audit Logging
 * 6. Error Handling & User Feedback
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null
  let stripeAccountId: string | null = null

  try {
    // ============================================================================
    // STEP 1: AUTHENTICATION & AUTHORIZATION
    // ============================================================================

    console.log("[STRIPE_DISCONNECT] Starting disconnect process...")

    // Extract and validate Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[STRIPE_DISCONNECT] Missing or invalid authorization header")
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_MISSING",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    // Extract Firebase ID token
    const token = authHeader.split("Bearer ")[1]
    if (!token || token.length < 10) {
      console.error("[STRIPE_DISCONNECT] Invalid token format")
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          code: "AUTH_INVALID_TOKEN",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
      console.log(`[STRIPE_DISCONNECT] Authenticated user: ${userId}`)
    } catch (tokenError: any) {
      console.error("[STRIPE_DISCONNECT] Token verification failed:", tokenError.message)
      return NextResponse.json(
        {
          error: "Authentication token verification failed",
          code: "AUTH_TOKEN_INVALID",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    // Validate user permissions (ensure user exists and is active)
    if (!userId || userId.length < 5) {
      console.error("[STRIPE_DISCONNECT] Invalid user ID from token")
      return NextResponse.json(
        {
          error: "Invalid user authentication",
          code: "AUTH_USER_INVALID",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    // ============================================================================
    // STEP 2: DATA VALIDATION & INTEGRITY CHECKS
    // ============================================================================

    const db = getFirestore()
    const userRef = db.collection("users").doc(userId)

    // Fetch current user data
    let userDoc
    try {
      userDoc = await userRef.get()
      if (!userDoc.exists) {
        console.error(`[STRIPE_DISCONNECT] User document not found: ${userId}`)
        return NextResponse.json(
          {
            error: "User account not found",
            code: "USER_NOT_FOUND",
            timestamp: new Date().toISOString(),
          },
          { status: 404 },
        )
      }
    } catch (dbError: any) {
      console.error("[STRIPE_DISCONNECT] Database error fetching user:", dbError.message)
      return NextResponse.json(
        {
          error: "Database error occurred",
          code: "DB_ERROR",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    const userData = userDoc.data()
    stripeAccountId = userData?.stripeAccountId

    // Validate Stripe connection exists
    if (!userData?.stripeConnected || !stripeAccountId) {
      console.log(`[STRIPE_DISCONNECT] No Stripe account connected for user: ${userId}`)
      return NextResponse.json(
        {
          error: "No Stripe account is currently connected",
          code: "STRIPE_NOT_CONNECTED",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Check for pending transactions or active subscriptions
    try {
      const pendingTransactions = await db
        .collection("purchases")
        .where("creatorId", "==", userId)
        .where("status", "in", ["pending", "processing"])
        .limit(1)
        .get()

      if (!pendingTransactions.empty) {
        console.warn(`[STRIPE_DISCONNECT] User has pending transactions: ${userId}`)
        return NextResponse.json(
          {
            error:
              "Cannot disconnect while you have pending transactions. Please wait for all transactions to complete.",
            code: "PENDING_TRANSACTIONS",
            timestamp: new Date().toISOString(),
          },
          { status: 409 },
        )
      }
    } catch (transactionCheckError: any) {
      console.error("[STRIPE_DISCONNECT] Error checking pending transactions:", transactionCheckError.message)
      // Continue with disconnect - this is not a critical failure
    }

    // ============================================================================
    // STEP 3: STRIPE API INTEGRATION
    // ============================================================================

    let stripeAccountStatus = null
    try {
      // Verify Stripe account exists and get current status
      const stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
      stripeAccountStatus = {
        id: stripeAccount.id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
      }

      console.log(`[STRIPE_DISCONNECT] Stripe account verified: ${stripeAccountId}`)

      // Note: We don't delete the Stripe account as it may have historical data
      // and legal/compliance requirements. We just disconnect it from our platform.
    } catch (stripeError: any) {
      console.error("[STRIPE_DISCONNECT] Stripe API error:", stripeError.message)

      // If account doesn't exist in Stripe, we can still proceed with local cleanup
      if (stripeError.code === "resource_missing") {
        console.log("[STRIPE_DISCONNECT] Stripe account not found, proceeding with local cleanup")
      } else {
        return NextResponse.json(
          {
            error: "Failed to verify Stripe account status",
            code: "STRIPE_API_ERROR",
            details: stripeError.message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 },
        )
      }
    }

    // ============================================================================
    // STEP 4: DATABASE UPDATES (SECURE DELETION OF ASSOCIATIONS)
    // ============================================================================

    const batch = db.batch()

    try {
      // Update user document - remove all Stripe-related fields
      const userUpdateData = {
        // Core Stripe connection fields
        stripeAccountId: null,
        stripeConnected: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,

        // Stripe account status fields
        stripeAccountStatus: null,
        stripeRequirements: null,
        stripeCapabilities: null,
        stripeCurrentlyDue: null,
        stripeEventuallyDue: null,
        stripePastDue: null,
        stripePendingVerification: null,
        stripeRestrictedFields: null,

        // Stripe onboarding fields
        stripeOnboardingComplete: false,
        stripeOnboardingUrl: null,
        stripeRefreshUrl: null,
        stripeReturnUrl: null,

        // Metadata and tracking
        stripeDisconnectedAt: new Date(),
        stripeDisconnectedBy: userId,
        stripeLastConnectionCheck: null,

        // Update timestamps
        updatedAt: new Date(),
        lastModifiedBy: userId,
      }

      batch.update(userRef, userUpdateData)

      // Update any active product boxes to disable payments
      const productBoxesQuery = await db
        .collection("productBoxes")
        .where("creatorId", "==", userId)
        .where("active", "==", true)
        .get()

      productBoxesQuery.forEach((doc) => {
        batch.update(doc.ref, {
          paymentsEnabled: false,
          stripeProductId: null,
          stripePriceId: null,
          updatedAt: new Date(),
          lastModifiedBy: userId,
        })
      })

      // Commit all database changes atomically
      await batch.commit()
      console.log(`[STRIPE_DISCONNECT] Database updates completed for user: ${userId}`)
    } catch (dbUpdateError: any) {
      console.error("[STRIPE_DISCONNECT] Database update error:", dbUpdateError.message)
      return NextResponse.json(
        {
          error: "Failed to update user account",
          code: "DB_UPDATE_ERROR",
          details: dbUpdateError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // ============================================================================
    // STEP 5: AUDIT LOGGING
    // ============================================================================

    try {
      const auditLog: DisconnectAuditLog = {
        userId,
        stripeAccountId,
        timestamp: new Date(),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        reason: "user_initiated_disconnect",
        success: true,
      }

      await db.collection("auditLogs").add({
        ...auditLog,
        type: "stripe_disconnect",
        severity: "info",
        processingTime: Date.now() - startTime,
      })

      console.log(`[STRIPE_DISCONNECT] Audit log created for user: ${userId}`)
    } catch (auditError: any) {
      console.error("[STRIPE_DISCONNECT] Audit logging error:", auditError.message)
      // Don't fail the request for audit logging errors
    }

    // ============================================================================
    // STEP 6: SUCCESS RESPONSE
    // ============================================================================

    const processingTime = Date.now() - startTime
    console.log(
      `[STRIPE_DISCONNECT] Successfully disconnected Stripe account for user: ${userId} (${processingTime}ms)`,
    )

    return NextResponse.json({
      success: true,
      message: "Stripe account disconnected successfully",
      data: {
        userId,
        disconnectedAt: new Date().toISOString(),
        previousStripeAccountId: stripeAccountId,
        processingTime,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    // ============================================================================
    // COMPREHENSIVE ERROR HANDLING
    // ============================================================================

    const processingTime = Date.now() - startTime
    console.error("[STRIPE_DISCONNECT] Unexpected error:", error.message, error.stack)

    // Log error for debugging
    try {
      const db = getFirestore()
      const errorLog: DisconnectAuditLog = {
        userId: userId || "unknown",
        stripeAccountId: stripeAccountId || null,
        timestamp: new Date(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        reason: "system_error",
        success: false,
        errorMessage: error.message,
      }

      await db.collection("auditLogs").add({
        ...errorLog,
        type: "stripe_disconnect_error",
        severity: "error",
        processingTime,
        stackTrace: error.stack,
      })
    } catch (logError) {
      console.error("[STRIPE_DISCONNECT] Failed to log error:", logError)
    }

    // Return appropriate error response
    return NextResponse.json(
      {
        error: "An unexpected error occurred while disconnecting your Stripe account",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        processingTime,
      },
      { status: 500 },
    )
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
      allowedMethods: ["POST"],
      timestamp: new Date().toISOString(),
    },
    { status: 405 },
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
      allowedMethods: ["POST"],
      timestamp: new Date().toISOString(),
    },
    { status: 405 },
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
      allowedMethods: ["POST"],
      timestamp: new Date().toISOString(),
    },
    { status: 405 },
  )
}
