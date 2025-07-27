import { type NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Debug] Starting connection loss debug for user: ${userId}`)

    // Get current timestamp
    const timestamp = new Date().toISOString()

    // 1. Get Firebase user info
    const firebaseUser = await adminAuth.getUser(userId)
    const userInfo = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || null,
      emailVerified: firebaseUser.emailVerified,
      lastSignInTime: firebaseUser.metadata.lastSignInTime || null,
      creationTime: firebaseUser.metadata.creationTime || null,
    }

    // 2. Get Firestore user document
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDocSnap = await userDocRef.get()

    const firestoreUserDoc = {
      exists: userDocSnap.exists,
      data: userDocSnap.exists ? userDocSnap.data() : null,
      stripeFields: {
        stripeAccountId: null,
        stripeAccessToken: null,
        stripeRefreshToken: null,
        stripeScope: null,
        stripeConnectedAt: null,
        stripeConnectionStatus: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeAccountStatus: null,
        updatedAt: null,
        createdAt: null,
      },
    }

    if (userDocSnap.exists) {
      const userData = userDocSnap.data()!
      firestoreUserDoc.stripeFields = {
        stripeAccountId: userData.stripeAccountId || null,
        stripeAccessToken: userData.stripeAccessToken || null,
        stripeRefreshToken: userData.stripeRefreshToken || null,
        stripeScope: userData.stripeScope || null,
        stripeConnectedAt: userData.stripeConnectedAt || null,
        stripeConnectionStatus: userData.stripeConnectionStatus || null,
        stripeChargesEnabled: userData.stripeChargesEnabled || false,
        stripePayoutsEnabled: userData.stripePayoutsEnabled || false,
        stripeDetailsSubmitted: userData.stripeDetailsSubmitted || false,
        stripeAccountStatus: userData.stripeAccountStatus || null,
        updatedAt: userData.updatedAt || null,
        createdAt: userData.createdAt || null,
      }
    }

    // 3. Check Stripe account directly
    const stripeAccountCheck = {
      success: false,
      accountExists: false,
      accountData: null,
      error: null,
    }

    if (firestoreUserDoc.stripeFields.stripeAccountId) {
      try {
        console.log(`🔍 [Debug] Checking Stripe account: ${firestoreUserDoc.stripeFields.stripeAccountId}`)
        const account = await stripe.accounts.retrieve(firestoreUserDoc.stripeFields.stripeAccountId)
        stripeAccountCheck.success = true
        stripeAccountCheck.accountExists = true
        stripeAccountCheck.accountData = {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          country: account.country,
          business_type: account.business_type,
          created: account.created,
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            past_due: account.requirements?.past_due || [],
            eventually_due: account.requirements?.eventually_due || [],
            pending_verification: account.requirements?.pending_verification || [],
          },
        }
      } catch (stripeError: any) {
        console.error(`❌ [Debug] Stripe account check failed:`, stripeError)
        stripeAccountCheck.success = false
        stripeAccountCheck.accountExists = false
        stripeAccountCheck.error = stripeError.message

        if (stripeError.code === "account_invalid") {
          stripeAccountCheck.error = "Account does not exist in Stripe (may have been deleted)"
        }
      }
    } else {
      stripeAccountCheck.error = "No Stripe account ID found in user document"
    }

    // 4. Check OAuth states
    const oauthStatesQuery = await adminDb
      .collection("oauth_states")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get()

    const now = Date.now()
    const fifteenMinutes = 15 * 60 * 1000

    const oauthStates = {
      total: oauthStatesQuery.size,
      recent: [] as any[],
      expired: 0,
      used: 0,
    }

    oauthStatesQuery.forEach((doc) => {
      const data = doc.data()
      const isExpired = now - data.createdAt > fifteenMinutes

      if (data.used) oauthStates.used++
      if (isExpired) oauthStates.expired++

      oauthStates.recent.push({
        id: doc.id,
        createdAt: data.createdAt,
        used: data.used || false,
        usedAt: data.usedAt || null,
        expired: isExpired,
      })
    })

    // 5. Check connection history (if we have any audit logs)
    const connectionHistory = {
      hasHistory: false,
      lastConnection: null,
      connectionAttempts: [] as any[],
    }

    // Try to find any connection-related logs or history
    try {
      const historyQuery = await adminDb
        .collection("connection_history")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .limit(5)
        .get()

      if (!historyQuery.empty) {
        connectionHistory.hasHistory = true
        connectionHistory.lastConnection = historyQuery.docs[0].data()
        connectionHistory.connectionAttempts = historyQuery.docs.map((doc) => doc.data())
      }
    } catch (historyError) {
      console.log("📝 [Debug] No connection history collection found (this is normal)")
    }

    // 6. System checks
    const systemChecks = {
      firebaseAuth: true, // We got here, so it's working
      firestoreConnection: true, // We queried Firestore successfully
      stripeApiConnection: false,
      environmentVariables: {
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        firebaseConfig: !!(
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          process.env.FIREBASE_PRIVATE_KEY
        ),
      },
    }

    // Test Stripe API connection
    try {
      await stripe.accounts.list({ limit: 1 })
      systemChecks.stripeApiConnection = true
    } catch (stripeTestError) {
      console.error("❌ [Debug] Stripe API test failed:", stripeTestError)
      systemChecks.stripeApiConnection = false
    }

    const debugData = {
      timestamp,
      user: userInfo,
      firestoreUserDoc,
      stripeAccountCheck,
      oauthStates,
      connectionHistory,
      systemChecks,
    }

    console.log(`✅ [Debug] Debug data compiled for user: ${userId}`)

    return NextResponse.json(debugData)
  } catch (error: any) {
    console.error("❌ [Debug] Debug API error:", error)
    return NextResponse.json({ error: `Debug failed: ${error.message}` }, { status: 500 })
  }
}
