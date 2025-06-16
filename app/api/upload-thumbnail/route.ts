import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) return null

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

// Helper function to upload to R2/Cloudflare
async function uploadToR2(file: File, filename: string): Promise<string> {
  const endpoint = process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 configuration missing")
  }

  // Use AWS SDK v3 for R2 upload
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

  const s3Client = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  })

  const key = `thumbnails/${filename}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: file.type || "image/jpeg",
    ContentDisposition: "inline",
  })

  await s3Client.send(command)

  // Return public URL
  const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
  if (publicDomain) {
    return `${publicDomain}/${key}`
  }

  return `https://pub-${bucketName}.r2.dev/${key}`
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Thumbnail Upload] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const filename = formData.get("filename") as string

    if (!file || !filename) {
      return NextResponse.json({ error: "File and filename are required" }, { status: 400 })
    }

    console.log(`📤 [Thumbnail Upload] Uploading: ${filename} (${file.size} bytes)`)

    try {
      // Upload to R2
      const publicUrl = await uploadToR2(file, filename)

      console.log(`✅ [Thumbnail Upload] Uploaded successfully: ${publicUrl}`)

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: filename,
        size: file.size,
      })
    } catch (uploadError) {
      console.error("❌ [Thumbnail Upload] Upload error:", uploadError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to upload thumbnail",
          details: uploadError instanceof Error ? uploadError.message : "Unknown upload error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Thumbnail Upload] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
