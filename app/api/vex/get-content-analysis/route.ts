import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

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

const db = getFirestore()
const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Vex Debug] Getting content analysis...")

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

    // Get stored content analysis
    const analysisDoc = await db.collection("vexContentAnalysis").doc(userId).get()

    if (!analysisDoc.exists) {
      return NextResponse.json({
        success: false,
        message: "No content analysis found for user",
        analysis: null,
      })
    }

    const analysisData = analysisDoc.data()

    console.log("✅ [Vex Debug] Content analysis found:", {
      contentCount: analysisData?.contentItems?.length || 0,
      lastUpdated: analysisData?.lastUpdated,
      categories: Object.keys(analysisData?.categories || {}),
    })

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysisDoc.id,
        ...analysisData,
        contentItems: analysisData?.contentItems || [],
        categories: analysisData?.categories || {},
        lastUpdated: analysisData?.lastUpdated,
      },
    })
  } catch (error: any) {
    console.error("❌ [Vex Debug] Error getting content analysis:", error)
    return NextResponse.json(
      {
        error: "Failed to get content analysis",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
