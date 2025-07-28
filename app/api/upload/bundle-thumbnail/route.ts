import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

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

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ [Bundle Thumbnail] Starting upload process...")

    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔑 [Bundle Thumbnail] Authenticated user: ${userId}`)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file || !bundleId) {
      return NextResponse.json({ error: "File and bundleId are required" }, { status: 400 })
    }

    console.log(`📦 [Bundle Thumbnail] Processing for bundle: ${bundleId}`)
    console.log(`📁 [Bundle Thumbnail] File details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized - not bundle owner" }, { status: 403 })
    }

    // Validate file
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `bundle-thumbnails/${bundleId}/${timestamp}.${fileExtension}`

    console.log(`📤 [Bundle Thumbnail] Uploading to R2: ${fileName}`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
    })

    await r2Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`

    console.log(`✅ [Bundle Thumbnail] Upload successful. Public URL: ${publicUrl}`)

    // Update bundle document with thumbnail URL
    const updateData = {
      coverImage: publicUrl,
      customPreviewThumbnail: publicUrl,
      coverImageUrl: publicUrl, // For backward compatibility
      thumbnailUrl: publicUrl, // Additional field for consistency
      updatedAt: new Date(),
      thumbnailUploadedAt: new Date(),
    }

    await db.collection("bundles").doc(bundleId).update(updateData)

    console.log(`📝 [Bundle Thumbnail] Updated bundle document with URLs:`, {
      bundleId,
      coverImage: publicUrl,
      customPreviewThumbnail: publicUrl,
      coverImageUrl: publicUrl,
      thumbnailUrl: publicUrl,
    })

    // Also update any related product boxes for consistency
    try {
      const productBoxQuery = await db.collection("productBoxes").where("bundleId", "==", bundleId).get()

      if (!productBoxQuery.empty) {
        const batch = db.batch()
        productBoxQuery.docs.forEach((doc) => {
          batch.update(doc.ref, {
            coverImage: publicUrl,
            customPreviewThumbnail: publicUrl,
            updatedAt: new Date(),
          })
        })
        await batch.commit()
        console.log(`📝 [Bundle Thumbnail] Updated ${productBoxQuery.size} related product boxes`)
      }
    } catch (productBoxError) {
      console.warn("⚠️ [Bundle Thumbnail] Failed to update product boxes:", productBoxError)
      // Don't fail the main operation
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      bundleId: bundleId,
      message: "Bundle thumbnail uploaded successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnail] Upload failed:", error)
    return NextResponse.json(
      {
        error: "Failed to upload thumbnail",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
