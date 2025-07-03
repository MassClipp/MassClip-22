import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  console.log("🖼️ [Bundle Thumbnail] Upload request received")

  try {
    // Import dependencies
    const firebaseAdmin = await import("@/lib/firebase-admin")
    const { db, verifyIdToken } = firebaseAdmin

    // Get auth token
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Bundle Thumbnail] Missing authorization header")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`✅ [Bundle Thumbnail] User authenticated: ${userId}`)

    // Parse form data
    const formData = await req.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file || !bundleId) {
      console.error("❌ [Bundle Thumbnail] Missing file or bundleId")
      return new NextResponse("Missing file or bundleId", { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ [Bundle Thumbnail] Invalid file type: ${file.type}`)
      return new NextResponse("Invalid file type. Please use JPEG, PNG, or WebP", { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      console.error(`❌ [Bundle Thumbnail] File too large: ${file.size} bytes`)
      return new NextResponse("File too large. Maximum size is 5MB", { status: 400 })
    }

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle Thumbnail] Bundle not found: ${bundleId}`)
      return new NextResponse("Bundle not found", { status: 404 })
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.creatorId !== userId) {
      console.error(`❌ [Bundle Thumbnail] Unauthorized access to bundle: ${bundleId}`)
      return new NextResponse("Unauthorized", { status: 403 })
    }

    console.log(`✅ [Bundle Thumbnail] Bundle ownership verified: ${bundleId}`)

    // Upload to Cloudflare R2
    const fileBuffer = await file.arrayBuffer()
    const fileName = `bundle-thumbnails/${bundleId}/${Date.now()}-${file.name}`

    // Import R2 client
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

    const r2Client = new S3Client({
      region: "auto",
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
      ContentLength: file.size,
    })

    await r2Client.send(uploadCommand)

    // Construct public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`

    console.log(`✅ [Bundle Thumbnail] File uploaded: ${publicUrl}`)

    // Update bundle with thumbnail URL
    await db.collection("bundles").doc(bundleId).update({
      coverImage: publicUrl,
      updatedAt: new Date(),
    })

    console.log(`✅ [Bundle Thumbnail] Bundle updated with thumbnail: ${bundleId}`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "Thumbnail uploaded successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnail] Error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
