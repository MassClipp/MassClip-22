import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
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
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

const db = getFirestore()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundles API] Fetching bundle: ${bundleId}`)

    // Try to fetch from product-boxes collection first
    const productBoxRef = db.collection("product-boxes").doc(bundleId)
    const productBoxDoc = await productBoxRef.get()

    if (productBoxDoc.exists) {
      const data = productBoxDoc.data()
      console.log(`✅ [Bundles API] Found product box: ${bundleId}`)

      return NextResponse.json({
        id: bundleId,
        title: data?.title || data?.name || "Untitled Bundle",
        description: data?.description || "",
        thumbnailUrl: data?.thumbnailUrl || data?.customPreviewThumbnail,
        customPreviewThumbnail: data?.customPreviewThumbnail,
        creatorUsername: data?.creatorUsername || data?.creator || "Unknown",
        totalItems: data?.totalItems || data?.itemCount || 0,
        price: data?.price || 0,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt,
      })
    }

    // Try bundles collection as fallback
    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleDoc = await bundleRef.get()

    if (bundleDoc.exists) {
      const data = bundleDoc.data()
      console.log(`✅ [Bundles API] Found bundle: ${bundleId}`)

      return NextResponse.json({
        id: bundleId,
        title: data?.title || data?.name || "Untitled Bundle",
        description: data?.description || "",
        thumbnailUrl: data?.thumbnailUrl || data?.customPreviewThumbnail,
        customPreviewThumbnail: data?.customPreviewThumbnail,
        creatorUsername: data?.creatorUsername || data?.creator || "Unknown",
        totalItems: data?.totalItems || data?.itemCount || 0,
        price: data?.price || 0,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt,
      })
    }

    console.log(`❌ [Bundles API] Bundle not found: ${bundleId}`)
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
  } catch (error: any) {
    console.error(`❌ [Bundles API] Error fetching bundle:`, error)
    return NextResponse.json({ error: "Failed to fetch bundle", details: error.message }, { status: 500 })
  }
}
