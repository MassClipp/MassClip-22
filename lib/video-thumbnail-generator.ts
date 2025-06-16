/**
 * Client-side video thumbnail generation utility
 */

export interface ThumbnailGenerationOptions {
  timeInSeconds?: number
  width?: number
  height?: number
  quality?: number
  format?: "jpeg" | "png" | "webp"
}

export interface ThumbnailResult {
  success: boolean
  thumbnailBlob?: Blob
  thumbnailDataUrl?: string
  error?: string
  width?: number
  height?: number
}

export class VideoThumbnailGenerator {
  /**
   * Generate thumbnail from video file or URL
   */
  static async generateThumbnail(
    videoSource: File | string,
    options: ThumbnailGenerationOptions = {},
  ): Promise<ThumbnailResult> {
    const { timeInSeconds = 5, width = 480, height = 270, quality = 0.8, format = "jpeg" } = options

    console.log(
      `🎬 [Thumbnail] Generating thumbnail at ${timeInSeconds}s for:`,
      videoSource instanceof File ? videoSource.name : videoSource,
    )

    try {
      // Create video element
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.muted = true
      video.playsInline = true

      // Set video source
      if (videoSource instanceof File) {
        video.src = URL.createObjectURL(videoSource)
      } else {
        video.src = videoSource
      }

      return new Promise((resolve) => {
        const cleanup = () => {
          if (videoSource instanceof File) {
            URL.revokeObjectURL(video.src)
          }
          video.remove()
        }

        video.onerror = (error) => {
          console.error("❌ [Thumbnail] Video load error:", error)
          cleanup()
          resolve({
            success: false,
            error: "Failed to load video for thumbnail generation",
          })
        }

        video.onloadedmetadata = () => {
          console.log(
            `📹 [Thumbnail] Video loaded - Duration: ${video.duration}s, Size: ${video.videoWidth}x${video.videoHeight}`,
          )

          // Ensure we don't seek beyond video duration
          const seekTime = Math.min(timeInSeconds, video.duration - 0.1)
          video.currentTime = seekTime
        }

        video.onseeked = () => {
          try {
            console.log(`🎯 [Thumbnail] Capturing frame at ${video.currentTime}s`)

            // Create canvas
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")

            if (!ctx) {
              cleanup()
              resolve({
                success: false,
                error: "Failed to get canvas context",
              })
              return
            }

            // Calculate dimensions maintaining aspect ratio
            const videoAspectRatio = video.videoWidth / video.videoHeight
            const targetAspectRatio = width / height

            let drawWidth = width
            let drawHeight = height
            let offsetX = 0
            let offsetY = 0

            if (videoAspectRatio > targetAspectRatio) {
              // Video is wider - fit height and crop width
              drawHeight = height
              drawWidth = height * videoAspectRatio
              offsetX = (width - drawWidth) / 2
            } else {
              // Video is taller - fit width and crop height
              drawWidth = width
              drawHeight = width / videoAspectRatio
              offsetY = (height - drawHeight) / 2
            }

            canvas.width = width
            canvas.height = height

            // Fill background with black
            ctx.fillStyle = "#000000"
            ctx.fillRect(0, 0, width, height)

            // Draw video frame
            ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)

            // Convert to blob
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  cleanup()
                  resolve({
                    success: false,
                    error: "Failed to create thumbnail blob",
                  })
                  return
                }

                const dataUrl = canvas.toDataURL(`image/${format}`, quality)

                console.log(`✅ [Thumbnail] Generated thumbnail: ${blob.size} bytes, ${width}x${height}`)

                cleanup()
                resolve({
                  success: true,
                  thumbnailBlob: blob,
                  thumbnailDataUrl: dataUrl,
                  width,
                  height,
                })
              },
              `image/${format}`,
              quality,
            )
          } catch (error) {
            console.error("❌ [Thumbnail] Canvas error:", error)
            cleanup()
            resolve({
              success: false,
              error: error instanceof Error ? error.message : "Canvas processing failed",
            })
          }
        }

        // Start loading the video
        video.load()
      })
    } catch (error) {
      console.error("❌ [Thumbnail] Generation error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Thumbnail generation failed",
      }
    }
  }

  /**
   * Upload thumbnail blob to storage and return URL
   */
  static async uploadThumbnail(
    thumbnailBlob: Blob,
    filename: string,
    authToken: string,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log(`📤 [Thumbnail] Uploading thumbnail for: ${filename}`)

      // Create form data
      const formData = new FormData()
      const thumbnailFilename = `${filename.split(".")[0]}_thumbnail.jpg`
      formData.append("file", thumbnailBlob, thumbnailFilename)
      formData.append("filename", thumbnailFilename)
      formData.append("type", "thumbnail")

      // Upload to your storage endpoint
      const response = await fetch("/api/upload-thumbnail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()

      console.log(`✅ [Thumbnail] Uploaded successfully: ${result.url}`)

      return {
        success: true,
        url: result.url,
      }
    } catch (error) {
      console.error("❌ [Thumbnail] Upload error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  /**
   * Generate and upload thumbnail in one step
   */
  static async generateAndUploadThumbnail(
    videoSource: File | string,
    filename: string,
    authToken: string,
    options: ThumbnailGenerationOptions = {},
  ): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
    try {
      // Generate thumbnail
      const thumbnailResult = await this.generateThumbnail(videoSource, options)

      if (!thumbnailResult.success || !thumbnailResult.thumbnailBlob) {
        return {
          success: false,
          error: thumbnailResult.error || "Failed to generate thumbnail",
        }
      }

      // Upload thumbnail
      const uploadResult = await this.uploadThumbnail(thumbnailResult.thumbnailBlob, filename, authToken)

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || "Failed to upload thumbnail",
        }
      }

      return {
        success: true,
        thumbnailUrl: uploadResult.url,
      }
    } catch (error) {
      console.error("❌ [Thumbnail] Generate and upload error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Process failed",
      }
    }
  }
}
