import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getMembership } from "@/lib/memberships-service"

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
    console.log("[v0] Bundle limits API called")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[v0] Bundle limits: No auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("[v0] Bundle limits: Token verified for user", decodedToken.uid)
    } catch (error) {
      console.error("[v0] Bundle limits: Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get("bundleId")
    const checkType = searchParams.get("type") // "create" or "content"

    console.log("[v0] Bundle limits: checkType =", checkType, "bundleId =", bundleId)

    let membership
    try {
      membership = await getMembership(userId)
      console.log("[v0] Bundle limits: Membership =", membership)
    } catch (error) {
      console.error("[v0] Bundle limits: Error getting membership:", error)
      membership = null
    }

    const isCreatorPro = membership?.plan === "creator_pro" || membership?.status === "trialing"
    console.log("[v0] Bundle limits: isCreatorPro =", isCreatorPro)

    if (checkType === "create") {
      try {
        const db = getFirestore()
        const bundlesSnapshot = await db.collection("productBoxes").where("creatorId", "==", userId).get()
        const currentBundleCount = bundlesSnapshot.size

        const maxAllowed = isCreatorPro ? Number.POSITIVE_INFINITY : 2
        const canCreate = isCreatorPro || currentBundleCount < 2

        console.log("[v0] Bundle limits: currentCount =", currentBundleCount, "maxAllowed =", maxAllowed)

        return NextResponse.json({
          canCreate,
          currentCount: currentBundleCount,
          maxAllowed,
          plan: membership?.plan || "free",
          status: membership?.status,
          isCreatorPro,
          message: canCreate
            ? "You can create a new bundle"
            : `You've reached your bundle limit (2). Upgrade to Creator Pro for unlimited bundles.`,
        })
      } catch (error) {
        console.error("[v0] Bundle limits: Error querying bundles:", error)
        return NextResponse.json(
          {
            error: "Failed to check bundle count",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        )
      }
    }

    if (checkType === "content") {
      const maxAllowed = isCreatorPro ? Number.POSITIVE_INFINITY : 10

      if (bundleId) {
        try {
          const db = getFirestore()
          const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()

          if (!bundleDoc.exists) {
            return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
          }

          const bundleData = bundleDoc.data()
          const currentVideoCount = bundleData?.contentItems?.length || 0
          const canAdd = isCreatorPro || currentVideoCount < 10

          return NextResponse.json({
            canAdd,
            currentCount: currentVideoCount,
            maxAllowed,
            plan: membership?.plan || "free",
            status: membership?.status,
            isCreatorPro,
            message: canAdd
              ? "You can add more videos to this bundle"
              : `You've reached the video limit for this bundle (10). Upgrade to Creator Pro for unlimited videos per bundle.`,
          })
        } catch (error) {
          console.error("[v0] Bundle limits: Error checking bundle videos:", error)
          return NextResponse.json(
            {
              error: "Failed to check video count",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          )
        }
      }

      return NextResponse.json({
        maxAllowed,
        plan: membership?.plan || "free",
        status: membership?.status,
        isCreatorPro,
        message: isCreatorPro ? "Unlimited videos per bundle" : "10 videos per bundle limit",
      })
    }

    console.log("[v0] Bundle limits: Invalid request parameters")
    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Bundle limits: Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
