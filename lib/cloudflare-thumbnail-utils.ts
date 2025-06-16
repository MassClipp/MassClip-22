/**
 * Utility functions for Cloudflare Stream thumbnail generation
 */

/**
 * Extract playback ID from various Cloudflare Stream URL formats
 */
export function extractPlaybackId(videoUrl: string): string | null {
  try {
    // Handle different Cloudflare Stream URL formats:
    // https://videodelivery.net/{playbackId}/manifest/video.m3u8
    // https://videodelivery.net/{playbackId}/iframe
    // https://customer-{hash}.cloudflarestream.com/{playbackId}/manifest/video.m3u8
    // https://pub-{hash}.r2.dev/path/to/video.mp4 (R2 storage - no playback ID)

    const url = new URL(videoUrl)

    // Check if it's a Cloudflare Stream URL
    if (url.hostname.includes("videodelivery.net")) {
      const pathParts = url.pathname.split("/").filter((part) => part.length > 0)
      if (pathParts.length > 0) {
        return pathParts[0] // First path segment is the playback ID
      }
    }

    // Check if it's a customer subdomain Stream URL
    if (url.hostname.includes("cloudflarestream.com")) {
      const pathParts = url.pathname.split("/").filter((part) => part.length > 0)
      if (pathParts.length > 0) {
        return pathParts[0] // First path segment is the playback ID
      }
    }

    // If it's R2 storage or other format, try to extract from filename
    if (url.hostname.includes("r2.dev") || url.hostname.includes("pub-")) {
      // For R2 URLs, we might need to generate a playback ID or use a different approach
      // For now, return null to indicate no Cloudflare Stream playback ID available
      return null
    }

    return null
  } catch (error) {
    console.error("Error extracting playback ID:", error)
    return null
  }
}

/**
 * Generate Cloudflare Stream thumbnail URL from playback ID
 */
export function generateCloudflareStreamThumbnail(
  playbackId: string,
  options: {
    time?: number // Time in seconds (default: 1)
    width?: number // Width in pixels (default: 480)
    height?: number // Height in pixels (default: 270)
    fit?: "crop" | "clip" | "scale" // Fit mode (default: 'crop')
  } = {},
): string {
  const { time = 1, width = 480, height = 270, fit = "crop" } = options

  const params = new URLSearchParams({
    time: time.toString(),
    width: width.toString(),
    height: height.toString(),
    fit,
  })

  return `https://videodelivery.net/${playbackId}/thumbnails/thumbnail.jpg?${params.toString()}`
}

/**
 * Generate thumbnail URL from video URL (auto-detects format)
 */
export function generateThumbnailFromVideoUrl(
  videoUrl: string,
  options: {
    time?: number
    width?: number
    height?: number
    fit?: "crop" | "clip" | "scale"
  } = {},
): string | null {
  const playbackId = extractPlaybackId(videoUrl)

  if (playbackId) {
    return generateCloudflareStreamThumbnail(playbackId, options)
  }

  // For non-Cloudflare Stream URLs, return null
  // The UI can fall back to dynamic thumbnail generation or placeholders
  return null
}

/**
 * Generate multiple thumbnail URLs for different sizes
 */
export function generateMultipleThumbnails(videoUrl: string, time = 1) {
  const playbackId = extractPlaybackId(videoUrl)

  if (!playbackId) {
    return {
      small: null,
      medium: null,
      large: null,
      original: null,
    }
  }

  return {
    small: generateCloudflareStreamThumbnail(playbackId, { time, width: 240, height: 135 }),
    medium: generateCloudflareStreamThumbnail(playbackId, { time, width: 480, height: 270 }),
    large: generateCloudflareStreamThumbnail(playbackId, { time, width: 720, height: 405 }),
    original: generateCloudflareStreamThumbnail(playbackId, { time, width: 1280, height: 720 }),
  }
}

/**
 * Check if a URL is a Cloudflare Stream URL
 */
export function isCloudflareStreamUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes("videodelivery.net") || urlObj.hostname.includes("cloudflarestream.com")
  } catch {
    return false
  }
}

/**
 * Generate a fallback thumbnail URL for non-Stream videos
 */
export function generateFallbackThumbnail(filename: string, title?: string): string {
  const query = title || filename.split(".")[0]
  return `/placeholder.svg?height=270&width=480&query=${encodeURIComponent(query)}`
}
