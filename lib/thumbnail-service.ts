/**
 * Comprehensive thumbnail generation service for multiple video sources
 */

interface ThumbnailOptions {
  width?: number
  height?: number
  timeInSeconds?: number
  quality?: number
}

interface ThumbnailResult {
  success: boolean
  thumbnailUrl?: string
  error?: string
  source: "vimeo" | "cloudflare" | "generated" | "fallback"
}

export class ThumbnailService {
  private static readonly DEFAULT_THUMBNAIL =
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=480&h=270&fit=crop&crop=center"
  private static readonly VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN

  /**
   * Generate thumbnail URL for any video source
   */
  static async generateThumbnail(
    videoUrl: string,
    filename: string,
    options: ThumbnailOptions = {},
  ): Promise<ThumbnailResult> {
    const { width = 480, height = 270, timeInSeconds = 1, quality = 0.8 } = options

    console.log(`🖼️ [Thumbnail] Generating thumbnail for: ${videoUrl}`)

    try {
      // 1. Try Vimeo API if it's a Vimeo video
      if (this.isVimeoUrl(videoUrl)) {
        const vimeoResult = await this.generateVimeoThumbnail(videoUrl, { width, height })
        if (vimeoResult.success) {
          console.log(`✅ [Thumbnail] Vimeo thumbnail generated: ${vimeoResult.thumbnailUrl}`)
          return vimeoResult
        }
      }

      // 2. Try Cloudflare Stream if it's a Stream URL
      if (this.isCloudflareStreamUrl(videoUrl)) {
        const streamResult = this.generateCloudflareStreamThumbnail(videoUrl, { width, height, timeInSeconds })
        if (streamResult.success) {
          console.log(`✅ [Thumbnail] Cloudflare Stream thumbnail generated: ${streamResult.thumbnailUrl}`)
          return streamResult
        }
      }

      // 3. Generate thumbnail from video file for other sources
      const generatedResult = await this.generateVideoFrameThumbnail(videoUrl, filename, {
        width,
        height,
        timeInSeconds,
        quality,
      })
      if (generatedResult.success) {
        console.log(`✅ [Thumbnail] Generated thumbnail from video: ${generatedResult.thumbnailUrl}`)
        return generatedResult
      }

      // 4. Fallback to default thumbnail
      console.log(`⚠️ [Thumbnail] Using fallback thumbnail for: ${filename}`)
      return {
        success: true,
        thumbnailUrl: this.DEFAULT_THUMBNAIL,
        source: "fallback",
      }
    } catch (error) {
      console.error(`❌ [Thumbnail] Error generating thumbnail:`, error)
      return {
        success: true, // Still return success with fallback
        thumbnailUrl: this.DEFAULT_THUMBNAIL,
        source: "fallback",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate thumbnail from Vimeo API
   */
  private static async generateVimeoThumbnail(
    videoUrl: string,
    options: { width: number; height: number },
  ): Promise<ThumbnailResult> {
    try {
      const videoId = this.extractVimeoVideoId(videoUrl)
      if (!videoId) {
        return { success: false, error: "Could not extract Vimeo video ID", source: "vimeo" }
      }

      if (!this.VIMEO_ACCESS_TOKEN) {
        return { success: false, error: "Vimeo access token not configured", source: "vimeo" }
      }

      const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${this.VIMEO_ACCESS_TOKEN}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      })

      if (!response.ok) {
        return { success: false, error: `Vimeo API error: ${response.status}`, source: "vimeo" }
      }

      const videoData = await response.json()
      const pictures = videoData.pictures?.sizes

      if (!pictures || pictures.length === 0) {
        return { success: false, error: "No thumbnails available from Vimeo", source: "vimeo" }
      }

      // Find the best matching thumbnail size
      const bestThumbnail = this.findBestThumbnailSize(pictures, options.width, options.height)

      return {
        success: true,
        thumbnailUrl: bestThumbnail.link,
        source: "vimeo",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Vimeo thumbnail generation failed",
        source: "vimeo",
      }
    }
  }

  /**
   * Generate thumbnail from Cloudflare Stream
   */
  private static generateCloudflareStreamThumbnail(
    videoUrl: string,
    options: { width: number; height: number; timeInSeconds: number },
  ): ThumbnailResult {
    try {
      const playbackId = this.extractCloudflarePlaybackId(videoUrl)
      if (!playbackId) {
        return { success: false, error: "Could not extract Cloudflare playback ID", source: "cloudflare" }
      }

      const params = new URLSearchParams({
        time: options.timeInSeconds.toString(),
        width: options.width.toString(),
        height: options.height.toString(),
        fit: "crop",
      })

      const thumbnailUrl = `https://videodelivery.net/${playbackId}/thumbnails/thumbnail.jpg?${params.toString()}`

      return {
        success: true,
        thumbnailUrl,
        source: "cloudflare",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cloudflare thumbnail generation failed",
        source: "cloudflare",
      }
    }
  }

  /**
   * Generate thumbnail by extracting frame from video
   */
  private static async generateVideoFrameThumbnail(
    videoUrl: string,
    filename: string,
    options: { width: number; height: number; timeInSeconds: number; quality: number },
  ): Promise<ThumbnailResult> {
    try {
      // This would typically be done server-side with FFmpeg or similar
      // For now, we'll return a structured approach that can be implemented

      console.log(`🎬 [Thumbnail] Would generate frame thumbnail for: ${videoUrl}`)

      // In a real implementation, you would:
      // 1. Download the video file
      // 2. Use FFmpeg to extract a frame at the specified time
      // 3. Resize the frame to the desired dimensions
      // 4. Upload the thumbnail to storage
      // 5. Return the public URL

      // For now, return fallback
      return {
        success: false,
        error: "Video frame extraction not implemented yet",
        source: "generated",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Video frame extraction failed",
        source: "generated",
      }
    }
  }

  /**
   * Utility methods
   */
  private static isVimeoUrl(url: string): boolean {
    return url.includes("vimeo.com") || url.includes("player.vimeo.com")
  }

  private static isCloudflareStreamUrl(url: string): boolean {
    return url.includes("videodelivery.net") || url.includes("cloudflarestream.com")
  }

  private static extractVimeoVideoId(url: string): string | null {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/,
      /vimeo\.com\/channels\/\w+\/(\d+)/,
      /vimeo\.com\/groups\/\w+\/videos\/(\d+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  private static extractCloudflarePlaybackId(url: string): string | null {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname.includes("videodelivery.net")) {
        const pathParts = urlObj.pathname.split("/").filter((part) => part.length > 0)
        return pathParts[0] || null
      }
    } catch {
      return null
    }
    return null
  }

  private static findBestThumbnailSize(
    sizes: Array<{ width: number; height: number; link: string }>,
    targetWidth: number,
    targetHeight: number,
  ): { width: number; height: number; link: string } {
    // Sort by how close the size is to our target
    const sorted = sizes.sort((a, b) => {
      const aDiff = Math.abs(a.width - targetWidth) + Math.abs(a.height - targetHeight)
      const bDiff = Math.abs(b.width - targetWidth) + Math.abs(b.height - targetHeight)
      return aDiff - bDiff
    })

    return sorted[0]
  }

  /**
   * Validate that a thumbnail URL is accessible
   */
  static async validateThumbnailUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get a safe fallback thumbnail URL
   */
  static getFallbackThumbnail(): string {
    return this.DEFAULT_THUMBNAIL
  }
}
