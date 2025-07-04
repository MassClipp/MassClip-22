import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Initialize R2 client for thumbnail uploads
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || ""

export interface ThumbnailGenerationOptions {
  captureTime?: number // Time in seconds to capture (default: 1)
  quality?: number // JPEG quality 0-1 (default: 0.8)
  maxWidth?: number // Max thumbnail width (default: 1280)
  maxHeight?: number // Max thumbnail height (default: 720)
}

export interface ThumbnailResult {
  thumbnailUrl: string
  width: number
  height: number
  size: number
}

/**
 * Generate thumbnail from video file (client-side) - Safari compatible
 */
export async function generateThumbnailFromFile(
  videoFile: File,
  options: ThumbnailGenerationOptions = {},
): Promise<ThumbnailResult> {
  const { captureTime = 1, quality = 0.8, maxWidth = 1280, maxHeight = 720 } = options

  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.muted = true
      video.playsInline = true
      video.crossOrigin = "anonymous"

      // Safari-specific settings
      video.setAttribute("webkit-playsinline", "true")
      video.setAttribute("playsinline", "true")

      const fileURL = URL.createObjectURL(videoFile)
      video.src = fileURL

      let thumbnailGenerated = false

      video.onloadedmetadata = () => {
        if (thumbnailGenerated) return
        // Ensure we don't seek beyond video duration, use earlier time for Safari
        const seekTime = Math.min(captureTime, Math.max(0.1, video.duration * 0.05))
        video.currentTime = seekTime
      }

      video.onloadeddata = () => {
        if (thumbnailGenerated) return
        // Fallback for Safari - try to generate immediately if metadata is loaded
        generateThumbnailFromVideo()
      }

      video.onseeked = () => {
        if (thumbnailGenerated) return
        generateThumbnailFromVideo()
      }

      const generateThumbnailFromVideo = async () => {
        if (thumbnailGenerated) return
        thumbnailGenerated = true

        try {
          // Create canvas with video dimensions
          const canvas = document.createElement("canvas")
          let { videoWidth, videoHeight } = video

          // Fallback dimensions if video dimensions aren't available
          if (!videoWidth || !videoHeight) {
            videoWidth = 1280
            videoHeight = 720
          }

          // Calculate scaled dimensions while maintaining aspect ratio
          if (videoWidth > maxWidth || videoHeight > maxHeight) {
            const aspectRatio = videoWidth / videoHeight
            if (videoWidth > videoHeight) {
              videoWidth = maxWidth
              videoHeight = maxWidth / aspectRatio
            } else {
              videoHeight = maxHeight
              videoWidth = maxHeight * aspectRatio
            }
          }

          canvas.width = videoWidth
          canvas.height = videoHeight

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            URL.revokeObjectURL(fileURL)
            reject(new Error("Could not get canvas context"))
            return
          }

          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

          // Convert to blob
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                URL.revokeObjectURL(fileURL)
                reject(new Error("Could not create thumbnail blob"))
                return
              }

              try {
                // Upload thumbnail to R2
                const thumbnailUrl = await uploadThumbnailToR2(blob, videoFile.name)

                URL.revokeObjectURL(fileURL)
                resolve({
                  thumbnailUrl,
                  width: videoWidth,
                  height: videoHeight,
                  size: blob.size,
                })
              } catch (error) {
                URL.revokeObjectURL(fileURL)
                reject(error)
              }
            },
            "image/jpeg",
            quality,
          )
        } catch (error) {
          URL.revokeObjectURL(fileURL)
          reject(error)
        }
      }

      video.onerror = () => {
        URL.revokeObjectURL(fileURL)
        reject(new Error("Error loading video for thumbnail generation"))
      }

      // Fallback timeout - shorter for Safari
      setTimeout(() => {
        if (!thumbnailGenerated) {
          URL.revokeObjectURL(fileURL)
          reject(new Error("Thumbnail generation timeout"))
        }
      }, 15000) // 15 second timeout
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate thumbnail from video URL (client-side) - Safari compatible
 */
export async function generateThumbnailFromUrl(
  videoUrl: string,
  options: ThumbnailGenerationOptions = {},
): Promise<ThumbnailResult> {
  const { captureTime = 1, quality = 0.8, maxWidth = 1280, maxHeight = 720 } = options

  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.muted = true
      video.playsInline = true
      video.crossOrigin = "anonymous"

      // Safari-specific settings
      video.setAttribute("webkit-playsinline", "true")
      video.setAttribute("playsinline", "true")

      video.src = videoUrl

      let thumbnailGenerated = false

      video.onloadedmetadata = () => {
        if (thumbnailGenerated) return
        const seekTime = Math.min(captureTime, Math.max(0.1, video.duration * 0.05))
        video.currentTime = seekTime
      }

      video.onloadeddata = () => {
        if (thumbnailGenerated) return
        generateThumbnailFromVideo()
      }

      video.onseeked = () => {
        if (thumbnailGenerated) return
        generateThumbnailFromVideo()
      }

      const generateThumbnailFromVideo = async () => {
        if (thumbnailGenerated) return
        thumbnailGenerated = true

        try {
          const canvas = document.createElement("canvas")
          let { videoWidth, videoHeight } = video

          // Fallback dimensions
          if (!videoWidth || !videoHeight) {
            videoWidth = 1280
            videoHeight = 720
          }

          // Scale dimensions
          if (videoWidth > maxWidth || videoHeight > maxHeight) {
            const aspectRatio = videoWidth / videoHeight
            if (videoWidth > videoHeight) {
              videoWidth = maxWidth
              videoHeight = maxWidth / aspectRatio
            } else {
              videoHeight = maxHeight
              videoWidth = maxHeight * aspectRatio
            }
          }

          canvas.width = videoWidth
          canvas.height = videoHeight

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }

          ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error("Could not create thumbnail blob"))
                return
              }

              try {
                const thumbnailUrl = await uploadThumbnailToR2(blob, `thumbnail-${Date.now()}`)
                resolve({
                  thumbnailUrl,
                  width: videoWidth,
                  height: videoHeight,
                  size: blob.size,
                })
              } catch (error) {
                reject(error)
              }
            },
            "image/jpeg",
            quality,
          )
        } catch (error) {
          reject(error)
        }
      }

      video.onerror = () => {
        reject(new Error("Error loading video for thumbnail generation"))
      }

      setTimeout(() => {
        if (!thumbnailGenerated) {
          reject(new Error("Thumbnail generation timeout"))
        }
      }, 15000)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Upload thumbnail blob to R2 storage
 */
async function uploadThumbnailToR2(blob: Blob, originalFileName: string): Promise<string> {
  try {
    // Generate unique thumbnail filename
    const timestamp = Date.now()
    const baseName = originalFileName.replace(/\.[^/.]+$/, "") // Remove extension
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const thumbnailKey = `thumbnails/${timestamp}-${sanitizedName}.jpg`

    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer()

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: thumbnailKey,
      Body: new Uint8Array(arrayBuffer),
      ContentType: "image/jpeg",
      ContentLength: blob.size,
    })

    await r2Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = publicDomain
      ? `${publicDomain}/${thumbnailKey}`
      : `https://pub-${bucketName}.r2.dev/${thumbnailKey}`

    console.log(`✅ [Thumbnail] Generated and uploaded: ${publicUrl}`)
    return publicUrl
  } catch (error) {
    console.error("❌ [Thumbnail] Upload failed:", error)
    throw new Error(`Failed to upload thumbnail: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Get fallback thumbnail URL
 */
export function getFallbackThumbnailUrl(title?: string): string {
  const query = title ? encodeURIComponent(title) : "video-thumbnail"
  return `/placeholder.svg?height=720&width=1280&query=${query}`
}

/**
 * Extract Vimeo thumbnail from video data
 */
export function extractVimeoThumbnail(vimeoData: any): string | null {
  try {
    if (vimeoData.pictures?.sizes && Array.isArray(vimeoData.pictures.sizes)) {
      // Find the largest thumbnail (usually the last one)
      const sizes = vimeoData.pictures.sizes
      const largestThumbnail = sizes[sizes.length - 1]
      return largestThumbnail?.link || null
    }
    return null
  } catch (error) {
    console.error("❌ [Vimeo] Error extracting thumbnail:", error)
    return null
  }
}

/**
 * Validate thumbnail URL
 */
export async function validateThumbnailUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok && response.headers.get("content-type")?.startsWith("image/")
  } catch {
    return false
  }
}

/**
 * Generate thumbnail data URL from video element (Safari compatible)
 */
export function generateThumbnailDataUrl(videoElement: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) return null

    // Set canvas dimensions
    canvas.width = videoElement.videoWidth || 320
    canvas.height = videoElement.videoHeight || 180

    // Draw video frame to canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    // Return data URL
    return canvas.toDataURL("image/jpeg", 0.8)
  } catch (error) {
    console.error("Error generating thumbnail data URL:", error)
    return null
  }
}
