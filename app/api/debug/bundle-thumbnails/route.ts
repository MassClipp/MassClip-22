import { type NextRequest, NextResponse } from "next/server"
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get("bundleId")
    const creatorId = searchParams.get("creatorId")

    console.log("🔍 [Bundle Thumbnails Debug] Starting diagnostic...")

    let query = db.collection("bundles")

    if (bundleId) {
      console.log(`🎯 [Bundle Thumbnails Debug] Checking specific bundle: ${bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()

      if (!bundleDoc.exists) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const data = bundleDoc.data()
      const thumbnailInfo = {
        bundleId: bundleDoc.id,
        title: data?.title,
        coverImage: data?.coverImage,
        customPreviewThumbnail: data?.customPreviewThumbnail,
        coverImageUrl: data?.coverImageUrl,
        thumbnailUrl: data?.thumbnailUrl,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt,
        thumbnailUploadedAt: data?.thumbnailUploadedAt,
        hasValidThumbnail: !!(data?.coverImage || data?.customPreviewThumbnail || data?.coverImageUrl),
      }

      return NextResponse.json({
        success: true,
        bundle: thumbnailInfo,
        message: "Bundle thumbnail diagnostic complete",
      })
    }

    if (creatorId) {
      query = query.where("creatorId", "==", creatorId)
    }

    const snapshot = await db.collection("bundles").get()
    const bundles: any[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      const thumbnailInfo = {
        bundleId: doc.id,
        title: data.title,
        creatorId: data.creatorId,
        coverImage: data.coverImage,
        customPreviewThumbnail: data.customPreviewThumbnail,
        coverImageUrl: data.coverImageUrl,
        thumbnailUrl: data.thumbnailUrl,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        thumbnailUploadedAt: data.thumbnailUploadedAt,
        hasValidThumbnail: !!(data.coverImage || data.customPreviewThumbnail || data.coverImageUrl),
        thumbnailFields: {
          coverImage: !!data.coverImage,
          customPreviewThumbnail: !!data.customPreviewThumbnail,
          coverImageUrl: !!data.coverImageUrl,
          thumbnailUrl: !!data.thumbnailUrl,
        },
      }
      bundles.push(thumbnailInfo)
    })

    const stats = {
      totalBundles: bundles.length,
      bundlesWithThumbnails: bundles.filter((b) => b.hasValidThumbnail).length,
      bundlesWithoutThumbnails: bundles.filter((b) => !b.hasValidThumbnail).length,
      thumbnailFieldStats: {
        coverImage: bundles.filter((b) => b.thumbnailFields.coverImage).length,
        customPreviewThumbnail: bundles.filter((b) => b.thumbnailFields.customPreviewThumbnail).length,
        coverImageUrl: bundles.filter((b) => b.thumbnailFields.coverImageUrl).length,
        thumbnailUrl: bundles.filter((b) => b.thumbnailFields.thumbnailUrl).length,
      },
    }

    console.log("📊 [Bundle Thumbnails Debug] Statistics:", stats)

    return NextResponse.json({
      success: true,
      bundles,
      stats,
      message: "Bundle thumbnails diagnostic complete",
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnails Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to run diagnostic",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
