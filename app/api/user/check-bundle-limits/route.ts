import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getMembership } from "@/lib/memberships-service"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

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
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get("bundleId")
    const checkType = searchParams.get("type") // "create" or "content"

    const membership = await getMembership(userId)
    const isCreatorPro = membership?.plan === "creator_pro" || membership?.status === "trialing"

    if (checkType === "create") {
      // Check if user can create a new bundle
      const bundlesQuery = query(collection(db, "productBoxes"), where("creatorId", "==", userId))
      const bundlesSnapshot = await getDocs(bundlesQuery)
      const currentBundleCount = bundlesSnapshot.size

      const maxAllowed = isCreatorPro ? Number.POSITIVE_INFINITY : 2
      const canCreate = isCreatorPro || currentBundleCount < 2

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
    }

    if (checkType === "content") {
      // Check video per bundle limit
      const maxAllowed = isCreatorPro ? Number.POSITIVE_INFINITY : 10

      if (bundleId) {
        const bundleDoc = await getDoc(doc(db, "productBoxes", bundleId))

        if (!bundleDoc.exists()) {
          return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
        }

        const bundleData = bundleDoc.data()
        const currentVideoCount = bundleData.contentItems?.length || 0
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
      }

      // Return general video limit info
      return NextResponse.json({
        maxAllowed,
        plan: membership?.plan || "free",
        status: membership?.status,
        isCreatorPro,
        message: isCreatorPro ? "Unlimited videos per bundle" : "10 videos per bundle limit",
      })
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
  } catch (error) {
    console.error("Error checking bundle limits:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
