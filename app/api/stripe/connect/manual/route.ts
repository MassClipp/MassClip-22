import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

interface Body {
  accountId: string
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, accountId } = (await request.json()) as Body

    if (!accountId || !idToken) {
      return NextResponse.json({ error: "accountId and idToken required" }, { status: 400 })
    }

    // Validate account ID format
    if (!accountId.startsWith("acct_")) {
      return NextResponse.json({ error: "Invalid account ID format. Must start with 'acct_'" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Manual Connect] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Manual Connect] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔗 [Manual Connect] Attempting to connect account ${accountId} for user: ${userId}`)

    // Verify the account exists and is accessible
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
      console.log(`✅ [Manual Connect] Account retrieved:`, {
        id: account.id,
        type: account.type,
        country: account.country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })
    } catch (stripeError: any) {
      console.error("❌ [Manual Connect] Failed to retrieve account:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json({ error: "Account not found. Please check the account ID." }, { status: 404 })
      }

      if (stripeError.code === "permission_denied") {
        return NextResponse.json(
          {
            error: "Cannot access this account. Make sure you're using the correct account ID and it's accessible.",
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to verify account",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    // Check if account is in the correct mode (test vs live)
    const accountIsTest = accountId.includes("_test_") || account.livemode === false
    const wrongEnv = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

    if (wrongEnv) {
      return NextResponse.json({ error: "Account livemode flag doesn’t match current environment" }, { status: 400 })
    }

    // Check if account is already connected to another user
    const existingUserQuery = await db
      .collection("users")
      .where(isTestMode ? "stripeTestAccountId" : "stripeAccountId", "==", accountId)
      .get()

    if (!existingUserQuery.empty) {
      const existingUser = existingUserQuery.docs[0]
      if (existingUser.id !== userId) {
        return NextResponse.json(
          {
            error: "This account is already connected to another user.",
          },
          { status: 409 },
        )
      }
    }

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    // Update user document with the connected account
    const field = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    await db
      .collection("users")
      .doc(userId)
      .set({ [field]: account.id }, { merge: true })

    console.log(`✅ [Manual Connect] Successfully connected account ${accountId} to user ${userId}`)

    // Check requirements
    const requirements = account.requirements || {}
    const currentlyDue = requirements.currently_due || []
    const pastDue = requirements.past_due || []
    const requirementsCount = currentlyDue.length + pastDue.length

    return NextResponse.json({
      success: true,
      accountId: account.id,
      accountStatus: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirementsCount,
        currentlyDue,
        pastDue,
        country: account.country,
        email: account.email,
        type: account.type,
        livemode: account.livemode,
      },
      message:
        account.charges_enabled && account.payouts_enabled
          ? "Account successfully connected and operational"
          : "Account connected but may require additional setup",
    })
  } catch (error: any) {
    console.error("❌ [Manual Connect] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to connect account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
