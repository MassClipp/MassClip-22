import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminApp } from "@/lib/firebase-admin"
import { generatePresignedUrl } from "@/lib/cloudflare-r2"

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the token
    try {
      await getAuth(adminApp).verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get the file name and content type from the request body
    const { fileName, contentType } = await request.json()

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a presigned URL for Cloudflare R2
    const { uploadUrl, publicUrl, expiresAt } = await generatePresignedUrl(fileName, contentType)

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      expiresAt,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}
