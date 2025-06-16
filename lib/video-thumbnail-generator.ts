/**
 * Generate a thumbnail from a video file or URL
 */
export class VideoThumbnailGenerator {
  /**
   * Generate thumbnail from video file (for upload process)
   */
  static async generateThumbnailFromFile(file: File, timeInSeconds = 1): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      video.addEventListener("loadedmetadata", () => {
        // Set canvas dimensions to video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Seek to the specified time
        video.currentTime = Math.min(timeInSeconds, video.duration)
      })

      video.addEventListener("seeked", () => {
        try {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert canvas to blob and then to data URL
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = () => reject(new Error("Failed to read thumbnail blob"))
                reader.readAsDataURL(blob)
              } else {
                reject(new Error("Failed to create thumbnail blob"))
              }
            },
            "image/jpeg",
            0.8,
          )
        } catch (error) {
          reject(error)
        }
      })

      video.addEventListener("error", () => {
        reject(new Error("Failed to load video for thumbnail generation"))
      })

      // Create object URL from file and set as video source
      const videoUrl = URL.createObjectURL(file)
      video.src = videoUrl
      video.load()

      // Clean up object URL after processing
      video.addEventListener("loadeddata", () => {
        URL.revokeObjectURL(videoUrl)
      })
    })
  }

  /**
   * Generate thumbnail from video URL (for display components)
   */
  static async generateThumbnailFromUrl(videoUrl: string, timeInSeconds = 1): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      // Set CORS attributes for cross-origin videos
      video.crossOrigin = "anonymous"
      video.preload = "metadata"

      video.addEventListener("loadedmetadata", () => {
        // Set canvas dimensions (limit max size for performance)
        const maxWidth = 480
        const maxHeight = 720

        let { videoWidth, videoHeight } = video

        // Scale down if too large
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

        // Seek to the specified time
        video.currentTime = Math.min(timeInSeconds, video.duration)
      })

      video.addEventListener("seeked", () => {
        try {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
          resolve(dataUrl)
        } catch (error) {
          reject(error)
        }
      })

      video.addEventListener("error", (e) => {
        console.error("Video thumbnail generation error:", e)
        reject(new Error("Failed to load video for thumbnail generation"))
      })

      // Set video source
      video.src = videoUrl
      video.load()
    })
  }

  /**
   * Upload thumbnail to storage and return URL
   */
  static async uploadThumbnail(thumbnailDataUrl: string, filename: string, authToken: string): Promise<string> {
    try {
      // Convert data URL to blob
      const response = await fetch(thumbnailDataUrl)
      const blob = await response.blob()

      // Generate unique thumbnail filename
      const timestamp = Date.now()
      const thumbnailFilename = `thumbnails/${timestamp}-${filename.replace(/\.[^/.]+$/, "")}.jpg`

      console.log(`🔍 [Thumbnail] Uploading thumbnail: ${thumbnailFilename}`)

      // Get upload URL for thumbnail
      const uploadResponse = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileName: thumbnailFilename,
          fileType: "image/jpeg",
        }),
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to get thumbnail upload URL")
      }

      const { uploadUrl, publicUrl } = await uploadResponse.json()

      // Upload thumbnail to storage
      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": "image/jpeg",
        },
      })

      if (!putResponse.ok) {
        throw new Error("Failed to upload thumbnail to storage")
      }

      console.log(`✅ [Thumbnail] Thumbnail uploaded successfully: ${publicUrl}`)
      return publicUrl
    } catch (error) {
      console.error("❌ [Thumbnail] Upload failed:", error)
      throw error
    }
  }
}
