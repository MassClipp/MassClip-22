import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { db } from "@/lib/firebase-admin"

// Configure Cloudflare R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Product Box Thumbnail] Starting thumbnail upload process")

    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Product Box Thumbnail] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const productBoxId = formData.get("productBoxId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log("📝 [Product Box Thumbnail] Upload request:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      productBoxId,
      userId: session.uid,
    })

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      console.log(`❌ [Product Box Thumbnail] Unsupported file type: ${file.type}`)
      return NextResponse.json(
        {
          error: "Unsupported file type",
          supportedTypes: ALLOWED_IMAGE_TYPES,
        },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log(`❌ [Product Box Thumbnail] File too large: ${file.size} > ${MAX_FILE_SIZE}`)
      return NextResponse.json(
        {
          error: "File too large",
          maxSize: MAX_FILE_SIZE,
          actualSize: file.size,
        },
        { status: 400 },
      )
    }

    // Get user profile to get username
    let username: string | undefined

    // Try userProfiles collection first
    const userProfileDoc = await db.collection("userProfiles").doc(session.uid).get()
    if (userProfileDoc.exists) {
      const userProfile = userProfileDoc.data()
      username = userProfile?.username
    }

    // If not found, try users collection
    if (!username) {
      const userDoc = await db.collection("users").doc(session.uid).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        username = userData?.username || userData?.displayName
      }
    }

    // Use fallback if still not found
    if (!username) {
      username = `user_${session.uid.slice(0, 8)}`
    }

    console.log(`📝 [Product Box Thumbnail] Using username: ${username}`)

    // Verify product box ownership
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Thumbnail] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    if (productBoxData?.creatorId !== session.uid) {
      console.log(`❌ [Product Box Thumbnail] Access denied for user ${session.uid} to product box ${productBoxId}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const uniqueFileName = `thumbnail_${productBoxId}_${timestamp}.${fileExtension}`
    const filePath = `creators/${username}/product-box-thumbnails/${uniqueFileName}`

    console.log(`📁 [Product Box Thumbnail] Generated file path: ${filePath}`)

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to R2
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedBy: session.uid,
        username: username,
        productBoxId: productBoxId,
        uploadTimestamp: timestamp.toString(),
        purpose: "product-box-thumbnail",
      },
    })

    await r2Client.send(putObjectCommand)

    console.log("✅ [Product Box Thumbnail] File uploaded successfully")

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${filePath}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filePath,
    })
  } catch (error) {
    console.error("❌ [Product Box Thumbnail] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload thumbnail",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
