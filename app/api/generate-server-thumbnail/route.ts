import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase/firebaseAdmin"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, unlink, readFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

const execAsync = promisify(exec)

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

async function generateThumbnailWithFFmpeg(
  videoUrl: string,
  timeInSeconds = 5,
  width = 480,
  height = 270,
): Promise<{ success: boolean; thumbnailBuffer?: Buffer; error?: string }> {
  const tempDir = tmpdir()
  const tempVideoPath = join(tempDir, `temp_video_${Date.now()}.mp4`)
  const tempThumbnailPath = join(tempDir, `temp_thumbnail_${Date.now()}.jpg`)

  try {
    console.log(`🎬 [FFmpeg] Generating thumbnail from: ${videoUrl}`)

    // Download video to temp file
    console.log(`📥 [FFmpeg] Downloading video...`)
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`)
    }

    const videoBuffer = Buffer.from(await response.arrayBuffer())
    await writeFile(tempVideoPath, videoBuffer)

    // Generate thumbnail using FFmpeg
    console.log(`🎯 [FFmpeg] Extracting frame at ${timeInSeconds}s...`)
    const ffmpegCommand = [
      "ffmpeg",
      "-i",
      `"${tempVideoPath}"`,
      "-ss",
      timeInSeconds.toString(),
      "-vframes",
      "1",
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
      "-q:v",
      "2",
      "-y",
      `"${tempThumbnailPath}"`,
    ].join(" ")

    console.log(`🔧 [FFmpeg] Command: ${ffmpegCommand}`)

    const { stdout, stderr } = await execAsync(ffmpegCommand)

    if (stderr && !stderr.includes("frame=")) {
      console.warn(`⚠️ [FFmpeg] Warning: ${stderr}`)
    }

    // Read generated thumbnail
    const thumbnailBuffer = await readFile(tempThumbnailPath)

    console.log(`✅ [FFmpeg] Generated thumbnail: ${thumbnailBuffer.length} bytes`)

    return {
      success: true,
      thumbnailBuffer,
    }
  } catch (error) {
    console.error("❌ [FFmpeg] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "FFmpeg processing failed",
    }
  } finally {
    // Cleanup temp files
    try {
      await unlink(tempVideoPath).catch(() => {})
      await unlink(tempThumbnailPath).catch(() => {})
    } catch (cleanupError) {
      console.warn("⚠️ [FFmpeg] Cleanup warning:", cleanupError)
    }
  }
}

async function uploadThumbnailToR2(buffer: Buffer, filename: string): Promise<string> {
  const endpoint = process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 configuration missing")
  }

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

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: "image/jpeg",
    ContentDisposition: "inline",
  })

  await s3Client.send(command)

  const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
  if (publicDomain) {
    return `${publicDomain}/${key}`
  }

  return `https://pub-${bucketName}.r2.dev/${key}`
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Server Thumbnail] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoUrl, filename, timeInSeconds = 5, width = 480, height = 270 } = await request.json()

    if (!videoUrl || !filename) {
      return NextResponse.json({ error: "videoUrl and filename are required" }, { status: 400 })
    }

    console.log(`🎬 [Server Thumbnail] Processing: ${filename}`)

    // Generate thumbnail with FFmpeg
    const thumbnailResult = await generateThumbnailWithFFmpeg(videoUrl, timeInSeconds, width, height)

    if (!thumbnailResult.success || !thumbnailResult.thumbnailBuffer) {
      return NextResponse.json(
        {
          success: false,
          error: thumbnailResult.error || "Failed to generate thumbnail",
        },
        { status: 500 },
      )
    }

    // Upload to R2
    const thumbnailFilename = `${filename.split(".")[0]}_thumbnail.jpg`
    const publicUrl = await uploadThumbnailToR2(thumbnailResult.thumbnailBuffer, thumbnailFilename)

    console.log(`✅ [Server Thumbnail] Generated and uploaded: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      thumbnailUrl: publicUrl,
      filename: thumbnailFilename,
      size: thumbnailResult.thumbnailBuffer.length,
    })
  } catch (error) {
    console.error("❌ [Server Thumbnail] Error:", error)
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
