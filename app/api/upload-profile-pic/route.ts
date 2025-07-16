import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { syncUserAndCreatorProfiles } from "@/lib/profile-sync"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Configure R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || ""
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || ""

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Upload Profile Pic] Starting upload process")

    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Upload Profile Pic] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      console.log("❌ [Upload Profile Pic] No token provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Firebase token
    let decodedToken
    try {
      const { getAuth } = await import("firebase-admin/auth")
      decodedToken = await getAuth().verifyIdToken(token)
      console.log("✅ [Upload Profile Pic] Token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Upload Profile Pic] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const uid = decodedToken.uid

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("❌ [Upload Profile Pic] No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`🔍 [Upload Profile Pic] Processing file: ${file.name}, size: ${file.size}`)

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      console.log(`❌ [Upload Profile Pic] Invalid file type: ${file.type}`)
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.log(`❌ [Upload Profile Pic] File too large: ${file.size} bytes`)
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Get current user data to check for existing profile picture
    let currentProfilePic = null
    try {
      const userDoc = await db.collection("users").doc(uid).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        currentProfilePic = userData?.profilePic
        console.log(`🔍 [Upload Profile Pic] Current profile pic: ${currentProfilePic}`)
      }
    } catch (error) {
      console.warn("⚠️ [Upload Profile Pic] Could not fetch current user data:", error)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `profile-pics/${uid}/${timestamp}.${fileExtension}`

    console.log(`🔍 [Upload Profile Pic] Uploading to: ${fileName}`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000", // 1 year cache
    })

    await r2Client.send(uploadCommand)
    console.log("✅ [Upload Profile Pic] File uploaded to R2 successfully")

    // Construct public URL
    const profilePicUrl = `${PUBLIC_URL}/${fileName}`
    console.log(`🔍 [Upload Profile Pic] Public URL: ${profilePicUrl}`)

    // Update user profile in Firestore
    try {
      const userRef = db.collection("users").doc(uid)
      const userDoc = await userRef.get()

      if (userDoc.exists) {
        // Update existing document
        await userRef.update({
          profilePic: profilePicUrl,
          updatedAt: new Date(),
        })
        console.log("✅ [Upload Profile Pic] Updated existing user document")
      } else {
        // Create new document (shouldn't happen, but just in case)
        await userRef.set({
          uid: uid,
          profilePic: profilePicUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        console.log("✅ [Upload Profile Pic] Created new user document")
      }

      // Get updated user data for sync
      const updatedUserDoc = await userRef.get()
      const userData = updatedUserDoc.data()

      // Sync with creator profile if username exists
      if (userData?.username) {
        console.log(`🔄 [Upload Profile Pic] Syncing creator profile for username: ${userData.username}`)
        const syncResult = await syncUserAndCreatorProfiles(uid, userData.username)

        if (syncResult.success) {
          console.log("✅ [Upload Profile Pic] Creator profile synced successfully")
        } else {
          console.warn("⚠️ [Upload Profile Pic] Creator profile sync failed:", syncResult.error)
        }
      } else {
        console.log("ℹ️ [Upload Profile Pic] No username found, skipping creator profile sync")
      }
    } catch (firestoreError) {
      console.error("❌ [Upload Profile Pic] Firestore update failed:", firestoreError)

      // Clean up uploaded file if Firestore update fails
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileName,
        })
        await r2Client.send(deleteCommand)
        console.log("🧹 [Upload Profile Pic] Cleaned up uploaded file after Firestore error")
      } catch (cleanupError) {
        console.error("❌ [Upload Profile Pic] Failed to clean up file:", cleanupError)
      }

      return NextResponse.json({ error: "Failed to update profile. Please try again." }, { status: 500 })
    }

    // Clean up old profile picture if it exists and is different
    if (currentProfilePic && currentProfilePic !== profilePicUrl && currentProfilePic.includes(PUBLIC_URL)) {
      try {
        const oldFileName = currentProfilePic.replace(`${PUBLIC_URL}/`, "")
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: oldFileName,
        })
        await r2Client.send(deleteCommand)
        console.log("🧹 [Upload Profile Pic] Cleaned up old profile picture")
      } catch (cleanupError) {
        console.warn("⚠️ [Upload Profile Pic] Failed to clean up old profile picture:", cleanupError)
        // Don't fail the request if cleanup fails
      }
    }

    console.log("✅ [Upload Profile Pic] Upload process completed successfully")

    return NextResponse.json({
      success: true,
      profilePicUrl: profilePicUrl,
      message: "Profile picture updated successfully",
    })
  } catch (error) {
    console.error("❌ [Upload Profile Pic] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
