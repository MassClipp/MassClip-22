import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { nanoid } from "nanoid"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  try {
    console.log("Get upload URL request received")

    // Get form data
    const formData = await request.formData()
    const filename = formData.get("filename") as string
    const contentType = formData.get("contentType") as string
    const isPremiumStr = formData.get("isPremium") as string
    const isPremium = isPremiumStr === "true"

    // Validate required fields
    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user info from session cookie
    let userId = null
    let username = null

    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin()

      // Get session cookie
      const sessionCookie = cookies().get("session")?.value

      if (!sessionCookie) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Verify session
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
      userId = decodedClaims.uid

      // Get user data from auth
      const userRecord = await getAuth().getUser(userId)
      username = userRecord.displayName || userId

      console.log("User authenticated:", { userId, username })
    } catch (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Generate a unique file ID
    const fileId = nanoid(10)
    const contentCategory = isPremium ? "premium" : "free"

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")

    // Create the storage path
    const storagePath = `massclip/creators/${username}/${contentCategory}/${fileId}-${sanitizedFilename}`

    // Create the command to generate a presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || "",
      Key: storagePath,
      ContentType: contentType,
      Metadata: {
        userId,
        username,
        fileId,
        contentCategory,
      },
    })

    // Generate the presigned URL with a 10-minute expiration
    const expiresIn = 60 * 10 // 10 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })

    // Generate the public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${storagePath}`

    console.log("Generated presigned URL for:", storagePath)

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      storagePath,
      fileId,
      expiresIn,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
