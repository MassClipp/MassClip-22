import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface CreateAccountRequest {
  idToken: string
  email?: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, email } = (await request.json()) as CreateAccountRequest

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Create Account] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const userEmail = email || decodedToken.email
    console.log(`🏦 [Create Account] Creating Stripe account for user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    // Check if account already exists
    const existingAccountId = userData?.[accountIdField]
    if (existingAccountId) {
      try {
        // Verify the account still exists in Stripe
        const existingAccount = await stripe.accounts.retrieve(existingAccountId)
        console.log(`ℹ️ [Create Account] Account already exists: ${existingAccountId}`)

        return NextResponse.json({
          success: true,
          accountId: existingAccountId,
          message: "Account already exists",
          existing: true,
        })
      } catch (stripeError: any) {
        if (stripeError.code === "resource_missing") {
          console.warn(`⚠️ [Create Account] Existing account ${existingAccountId} no longer exists, creating new one`)
          // Continue to create new account
        } else {
          throw stripeError
        }
      }
    }

    try {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: "express",
        email: userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          userId: userId,
          environment: isTestMode ? "test" : "live",
        },
      })

      console.log(`✅ [Create Account] Created Stripe account: ${account.id}`)

      // Update user document with new account ID
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: account.id,
          [connectedField]: false,
          [`${accountIdField}CreatedAt`]: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

      // Create onboarding link with correct redirect URI
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `https://massclip.pro/dashboard/connect-stripe?refresh=true`,
        return_url: `https://massclip.pro/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      console.log(`🔗 [Create Account] Created onboarding link for account: ${account.id}`)

      return NextResponse.json({
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
        message: "Account created successfully",
      })
    } catch (stripeError: any) {
      console.error("❌ [Create Account] Error creating Stripe account:", stripeError)
      return NextResponse.json(
        { error: "Failed to create Stripe account", details: stripeError.message },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Create Account] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to create account", details: error.message }, { status: 500 })
  }
}
