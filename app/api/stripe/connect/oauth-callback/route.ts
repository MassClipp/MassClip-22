import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  console.log("🔄 [OAuth Callback] Starting POST request processing")

  try {
    const { code, state } = await request.json()
    console.log("📝 [OAuth Callback] Received data:", {
      code: code ? `${code.substring(0, 10)}...` : "missing",
      state: state ? `${state.substring(0, 20)}...` : "missing",
    })

    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing required parameters:", { code: !!code, state: !!state })
      return NextResponse.json({ error: "Missing authorization code or state parameter" }, { status: 400 })
    }

    // Check if state document exists in Firestore
    console.log("🔍 [OAuth Callback] Looking up state document:", state)

    let stateDoc
    try {
      stateDoc = await adminDb.collection("stripe_oauth_states").doc(state).get()
      console.log("📄 [OAuth Callback] State document exists:", stateDoc.exists)
    } catch (firestoreError) {
      console.error("❌ [OAuth Callback] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error during state verification",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    if (!stateDoc.exists) {
      console.error("❌ [OAuth Callback] State document not found:", state)

      // Try to find any recent states for debugging
      try {
        const recentStates = await adminDb.collection("stripe_oauth_states").orderBy("createdAt", "desc").limit(5).get()

        console.log(
          "🔍 [OAuth Callback] Recent states in database:",
          recentStates.docs.map((doc) => ({
            id: doc.id.substring(0, 20) + "...",
            data: doc.data(),
          })),
        )
      } catch (debugError) {
        console.error("❌ [OAuth Callback] Error fetching recent states:", debugError)
      }

      return NextResponse.json(
        {
          error: "Invalid state parameter - session may have expired",
          details: "The OAuth state was not found in our database. Please try connecting again.",
        },
        { status: 400 },
      )
    }

    const stateData = stateDoc.data()
    console.log("📋 [OAuth Callback] State data:", stateData)

    // Check if state has expired
    if (stateData?.expiresAt && stateData.expiresAt.toDate() < new Date()) {
      console.error("❌ [OAuth Callback] State has expired:", stateData.expiresAt.toDate())
      await adminDb.collection("stripe_oauth_states").doc(state).delete()
      return NextResponse.json(
        {
          error: "OAuth session expired",
          details: "The OAuth session has expired. Please try connecting again.",
        },
        { status: 400 },
      )
    }

    const userId = stateData?.userId

    if (!userId) {
      console.error("❌ [OAuth Callback] No user ID found in state data:", stateData)
      return NextResponse.json(
        {
          error: "Invalid state data - missing user ID",
          details: "The OAuth state is corrupted. Please try connecting again.",
        },
        { status: 400 },
      )
    }

    console.log("👤 [OAuth Callback] Processing for user:", userId)

    // Clean up the state document
    try {
      await adminDb.collection("stripe_oauth_states").doc(state).delete()
      console.log("🗑️ [OAuth Callback] State document cleaned up")
    } catch (cleanupError) {
      console.warn("⚠️ [OAuth Callback] Failed to cleanup state document:", cleanupError)
      // Don't fail the request for cleanup errors
    }

    // Exchange the authorization code for access token
    console.log("🔄 [OAuth Callback] Exchanging code for token")

    let oauthResponse
    try {
      oauthResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      })
      console.log("✅ [OAuth Callback] OAuth token exchange successful")
    } catch (stripeError) {
      console.error("❌ [OAuth Callback] Stripe OAuth error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to exchange authorization code",
          details: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        },
        { status: 400 },
      )
    }

    const { stripe_user_id: accountId } = oauthResponse

    if (!accountId) {
      console.error("❌ [OAuth Callback] No account ID in OAuth response:", oauthResponse)
      return NextResponse.json(
        {
          error: "Failed to get Stripe account ID",
          details: "Stripe did not return an account ID",
        },
        { status: 400 },
      )
    }

    console.log("🏦 [OAuth Callback] Retrieved Stripe account ID:", accountId)

    // Get account details from Stripe
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
      console.log("📊 [OAuth Callback] Account details retrieved:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })
    } catch (accountError) {
      console.error("❌ [OAuth Callback] Failed to retrieve account details:", accountError)
      return NextResponse.json(
        {
          error: "Failed to retrieve account details",
          details: accountError instanceof Error ? accountError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Update user record in Firestore
    console.log("💾 [OAuth Callback] Updating user record")

    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .update({
          stripeAccountId: accountId,
          stripeAccountStatus: account.details_submitted ? "active" : "pending",
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeDetailsSubmitted: account.details_submitted,
          stripeConnectedAt: new Date(),
          updatedAt: new Date(),
        })

      console.log("✅ [OAuth Callback] User record updated successfully")
    } catch (updateError) {
      console.error("❌ [OAuth Callback] Failed to update user record:", updateError)
      return NextResponse.json(
        {
          error: "Failed to update user record",
          details: updateError instanceof Error ? updateError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    console.log(`🎉 [OAuth Callback] Successfully connected Stripe account ${accountId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      accountId,
      status: account.details_submitted ? "active" : "pending",
    })
  } catch (error: any) {
    console.error("💥 [OAuth Callback] Unexpected error:", error)
    console.error("📚 [OAuth Callback] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Failed to process OAuth callback",
        details: error.message || "Unknown error occurred",
        type: error.constructor.name,
      },
      { status: 500 },
    )
  }
}

// Keep GET handler for direct Stripe redirects (fallback)
export async function GET(request: NextRequest) {
  console.log("🔄 [OAuth Callback] GET request received")

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  console.log("📝 [OAuth Callback] GET parameters:", {
    code: code ? `${code.substring(0, 10)}...` : "missing",
    state: state ? `${state.substring(0, 20)}...` : "missing",
    error,
  })

  // Get base URL ensuring it has protocol
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`
  }

  console.log("🌐 [OAuth Callback] Using base URL:", baseUrl)

  // Redirect to the frontend callback page with parameters
  const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)

  if (code) callbackUrl.searchParams.set("code", code)
  if (state) callbackUrl.searchParams.set("state", state)
  if (error) callbackUrl.searchParams.set("error", error)

  console.log("↩️ [OAuth Callback] Redirecting to:", callbackUrl.toString())

  return NextResponse.redirect(callbackUrl)
}
