import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ [Bundle Thumbnail Upload] Starting upload process...")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string
    const idToken = formData.get("idToken") as string

    if (!file || !bundleId || !idToken) {
      console.error("❌ [Bundle Thumbnail Upload] Missing required fields:", {
        hasFile: !!file,
        bundleId,
        hasIdToken: !!idToken,
      })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user authentication
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Bundle Thumbnail Upload] User authenticated:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Bundle Thumbnail Upload] Authentication failed:", error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error("❌ [Bundle Thumbnail Upload] Bundle not found:", bundleId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    if (bundleData.creatorId !== decodedToken.uid) {
      console.error("❌ [Bundle Thumbnail Upload] Unauthorized access:", {
        bundleCreator: bundleData.creatorId,
        requestUser: decodedToken.uid,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `bundle-thumbnails/${bundleId}-${timestamp}.${fileExtension}`

    console.log("📁 [Bundle Thumbnail Upload] Uploading file:", {
      fileName,
      fileSize: file.size,
      fileType: file.type,
    })

    // Upload to R2
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.type,
    })

    await s3Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`
    console.log("🌐 [Bundle Thumbnail Upload] Generated public URL:", publicUrl)

    // Update bundle with thumbnail URL in multiple fields for redundancy
    const updateData = {
      coverImage: publicUrl,
      customPreviewThumbnail: publicUrl,
      coverImageUrl: publicUrl,
      thumbnailUrl: publicUrl,
      thumbnailUploadedAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("bundles").doc(bundleId).update(updateData)
    console.log("✅ [Bundle Thumbnail Upload] Bundle updated with thumbnail URLs")

    // Also update any related product boxes for consistency
    try {
      const productBoxQuery = await db.collection("productBoxes").where("bundleId", "==", bundleId).get()

      if (!productBoxQuery.empty) {
        const batch = db.batch()
        productBoxQuery.docs.forEach((doc) => {
          batch.update(doc.ref, {
            coverImage: publicUrl,
            customPreviewThumbnail: publicUrl,
            thumbnailUrl: publicUrl,
            updatedAt: new Date(),
          })
        })
        await batch.commit()
        console.log("✅ [Bundle Thumbnail Upload] Related product boxes updated")
      }
    } catch (error) {
      console.warn("⚠️ [Bundle Thumbnail Upload] Failed to update related product boxes:", error)
    }

    return NextResponse.json({
      success: true,
      thumbnailUrl: publicUrl,
      message: "Thumbnail uploaded successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnail Upload] Upload failed:", error)
    return NextResponse.json({ error: "Failed to upload thumbnail" }, { status: 500 })
  }
}
