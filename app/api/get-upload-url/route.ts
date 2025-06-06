import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { headers } from "next/headers"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Initialize R2 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

async function verifyAuthToken(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      console.log("❌ [Auth] No Bearer token found")
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      console.log("❌ [Auth] Empty token")
      return null
    }

    // Import auth here to avoid initialization issues
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    console.log("✅ [Auth] Token verified for user:", decodedToken.uid)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [R2 Upload] POST request received")

    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [R2 Upload] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    // Parse request body
    const { fileName, fileType } = await request.json()
    console.log("🔍 [R2 Upload] Request data:", { fileName, fileType })

    if (!fileName || !fileType) {
      console.error("❌ [R2 Upload] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user's username for folder organization
    let username = null
    try {
      console.log("🔍 [R2 Upload] Fetching user profile for:", user.uid)
      const userDocRef = db.collection("users").doc(user.uid)
      const userDoc = await userDocRef.get()

      // Fix: Check existence properly
      if (userDoc && userDoc.exists) {
        const userData = userDoc.data() || {}
        username = userData.username
        console.log("✅ [R2 Upload] Found username:", username)
      } else {
        console.warn("⚠️ [R2 Upload] User profile not found for:", user.uid)
      }
    } catch (error) {
      console.error("❌ [R2 Upload] Error fetching user profile:", error)
    }

    // Create username-based file path
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_") // Sanitize filename
    let fileKey: string

    if (username) {
      // Store in creators/username/ folder
      fileKey = `creators/${username}/${timestamp}-${sanitizedFileName}`
    } else {
      // Fallback to user ID folder
      fileKey = `users/${user.uid}/${timestamp}-${sanitizedFileName}`
    }

    console.log("🔍 [R2 Upload] Generated file key:", fileKey)

    // Set the bucket name from environment variable
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    console.log("🔍 [R2 Upload] Using bucket:", bucketName)

    if (!bucketName) {
      console.error("❌ [R2 Upload] R2 bucket not configured")
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    // Check if credentials are available
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY

    console.log("🔍 [R2 Upload] Config check:", {
      hasEndpoint: !!endpoint,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      hasBucket: !!bucketName,
    })

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      console.error("❌ [R2 Upload] Missing R2 credentials")
      return NextResponse.json({ error: "R2 credentials not configured" }, { status: 500 })
    }

    // Create the command to put an object in the bucket
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey, // Use the username-based path
      ContentType: fileType,
    })

    console.log("🔍 [R2 Upload] Generating presigned URL...")

    // Generate a pre-signed URL for uploading
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // URL expires in 1 hour
    console.log("✅ [R2 Upload] Presigned URL generated successfully")

    // Generate the public URL that will be accessible after upload
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${fileKey}`
    console.log("🔍 [R2 Upload] Public URL:", publicUrl)

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
      key: fileKey,
      username: username,
    })
  } catch (error) {
    console.error("❌ [R2 Upload] Error generating upload URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
