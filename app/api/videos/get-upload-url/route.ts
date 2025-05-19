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
    const title = formData.get("title") as string
    const isPremiumStr = formData.get("isPremium") as string
    const isPremium = isPremiumStr === "true"
    const filename = formData.get("filename") as string
    const contentType = formData.get("contentType") as string

    // Validate required fields
    if (!title || !filename || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user info
    let userId = "anonymous"
    let username = "anonymous"

    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin()

      // Get session cookie
      const sessionCookie = cookies().get("session")?.value

      if (!sessionCookie) {
        console.log("No session cookie found")
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

    // Create the key (path) for the file
    const key = `creators/${username}/${contentCategory}/${fileId}-${filename}`

    // Create the command to generate a presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Metadata: {
        userId,
        username,
        title,
        contentCategory,
      },
    })

    // Generate the presigned URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    console.log("Generated presigned URL for:", key)

    return NextResponse.json({
      url,
      key,
      fileId,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
