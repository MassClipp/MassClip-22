import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { db } from "@/lib/firebase-admin"

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
    console.log("Starting profile picture upload...")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      console.error("Missing file or userId in request")
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 })
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`)

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.error("File too large:", file.size)
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type:", file.type)
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 })
    }

    // Get current profile picture to delete old one
    let oldProfilePicKey: string | null = null
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()

        // Check both fields to find the old Cloudflare R2 URL
        const oldProfilePic = userData?.profilePic

        if (
          oldProfilePic &&
          typeof oldProfilePic === "string" &&
          oldProfilePic.includes(process.env.CLOUDFLARE_R2_PUBLIC_URL!)
        ) {
          // Extract the key from the old URL
          const urlParts = oldProfilePic.split("/")
          const keyIndex = urlParts.findIndex((part) => part === "profile_pics")
          if (keyIndex !== -1 && keyIndex + 1 < urlParts.length) {
            oldProfilePicKey = `profile_pics/${urlParts[keyIndex + 1].split("?")[0]}` // Remove query params
            console.log("Found old profile pic to delete:", oldProfilePicKey)
          }
        }
      }
    } catch (error) {
      console.warn("Could not fetch old profile picture for deletion:", error)
      // Continue with upload even if we can't delete the old one
    }

    // Create unique filename with timestamp for cache busting
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `profile_pics/${userId}_${timestamp}.${fileExtension}`

    console.log("Converting file to buffer...")
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log("Uploading to Cloudflare R2...")
    // Upload to Cloudflare R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000", // Cache for 1 year since we use unique filenames
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        userId: userId,
      },
    })

    await s3Client.send(uploadCommand)

    // Delete old profile picture after successful upload
    if (oldProfilePicKey) {
      try {
        console.log("Deleting old profile picture:", oldProfilePicKey)
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: oldProfilePicKey,
        })
        await s3Client.send(deleteCommand)
        console.log("Successfully deleted old profile picture")
      } catch (deleteError) {
        console.warn("Failed to delete old profile picture:", deleteError)
        // Don't fail the upload if deletion fails
      }
    }

    // Construct the public URL with cache busting
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}?v=${timestamp}`

    console.log("Upload successful, URL:", publicUrl)
    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Error uploading profile picture:", error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("AccessDenied")) {
        return NextResponse.json({ error: "Access denied. Please check R2 credentials." }, { status: 403 })
      }
      if (error.message.includes("NoSuchBucket")) {
        return NextResponse.json({ error: "Storage bucket not found." }, { status: 404 })
      }
      if (error.message.includes("network")) {
        return NextResponse.json({ error: "Network error. Please check your connection." }, { status: 503 })
      }
    }

    return NextResponse.json(
      {
        error: "Failed to upload profile picture. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
