import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getUserTierInfo } from "@/lib/user-tier-service"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Vex Debug] Getting bundle limits...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")

    // Verify authentication
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Vex Debug] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Vex Debug] User authenticated:", userId)

    console.log("🔍 [Vex Debug] Calling getUserTierInfo...")
    const tierInfo = await getUserTierInfo(userId)

    console.log("🔍 [Vex Debug] Raw tierInfo response:", JSON.stringify(tierInfo, null, 2))

    console.log("✅ [Vex Debug] Bundle limits found:", {
      bundlesCreated: tierInfo.bundlesCreated,
      bundlesLimit: tierInfo.bundlesLimit,
      reachedBundleLimit: tierInfo.reachedBundleLimit,
      tier: tierInfo.tier,
      maxVideosPerBundle: tierInfo.maxVideosPerBundle,
    })

    return NextResponse.json({
      success: true,
      bundleLimits: {
        bundlesCreated: tierInfo.bundlesCreated,
        bundlesLimit: tierInfo.bundlesLimit,
        reachedBundleLimit: tierInfo.reachedBundleLimit,
        tier: tierInfo.tier,
        maxVideosPerBundle: tierInfo.maxVideosPerBundle,
        canCreateBundle: !tierInfo.reachedBundleLimit,
        upgradeMessage: tierInfo.reachedBundleLimit
          ? `You've reached your limit of ${tierInfo.bundlesLimit} bundles. ${tierInfo.tier === "free" ? "Upgrade to Creator Pro for unlimited bundles or purchase extra bundle slots." : "Please contact support."}`
          : null,
      },
    })
  } catch (error: any) {
    console.error("❌ [Vex Debug] Error getting bundle limits:", error)
    return NextResponse.json(
      {
        error: "Failed to get bundle limits",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
