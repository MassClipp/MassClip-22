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

    console.log("🔍 [Vex Debug] Getting user tier info...")
    const tierInfo = await getUserTierInfo(userId)

    console.log("🔍 [Vex Debug] Raw tier info received:", {
      tier: tierInfo.tier,
      bundlesCreated: tierInfo.bundlesCreated,
      bundlesLimit: tierInfo.bundlesLimit,
      maxVideosPerBundle: tierInfo.maxVideosPerBundle,
      reachedBundleLimit: tierInfo.reachedBundleLimit,
      downloadsUsed: tierInfo.downloadsUsed,
      downloadsLimit: tierInfo.downloadsLimit,
    })

    const baseBundleLimit = tierInfo.tier === "starter" ? 5 : null // Changed from "free" with 2 bundles to "starter" with 5 bundles
    const totalBundleLimit = tierInfo.bundlesLimit || baseBundleLimit
    const extraBundleSlots = tierInfo.tier === "starter" && totalBundleLimit ? totalBundleLimit - 5 : 0 // Changed base from 2 to 5
    const bundlesCreated = tierInfo.bundlesCreated || 0
    const bundlesRemaining = totalBundleLimit ? totalBundleLimit - bundlesCreated : null

    const bundleLimits = {
      bundlesCreated,
      bundlesLimit: totalBundleLimit,
      baseBundleLimit, // Base Starter tier limit (5) or null for pro
      extraBundleSlots, // Additional purchased slots
      bundlesRemaining,
      maxVideosPerBundle: tierInfo.maxVideosPerBundle || (tierInfo.tier === "starter" ? 15 : null), // Changed from 10 to 15 for Starter
      reachedBundleLimit: tierInfo.reachedBundleLimit || false,
      tier: tierInfo.tier,
      canCreateBundle: !tierInfo.reachedBundleLimit,
      upgradeMessage: tierInfo.reachedBundleLimit
        ? `You've reached your limit of ${totalBundleLimit || 5} bundles. ${tierInfo.tier === "starter" ? "Upgrade to Creator Pro ($15/month) for unlimited bundles." : "Please contact support."}` // Updated messaging
        : null,
      limitBreakdown:
        tierInfo.tier === "starter"
          ? `Starter Plan: ${baseBundleLimit} bundles${extraBundleSlots > 0 ? ` + ${extraBundleSlots} purchased extra slots = ${totalBundleLimit} total` : ""}` // Updated tier name
          : "Creator Pro: Unlimited bundles",
    }

    console.log("✅ [Vex Debug] Final bundle limits response:", bundleLimits)

    return NextResponse.json({
      success: true,
      bundleLimits,
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
