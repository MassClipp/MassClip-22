/**
 * Utility functions for handling videos
 */

/**
 * Checks if a video URL is valid and accessible
 * @param url The URL to check
 * @returns Promise that resolves to true if the video is accessible
 */
export async function checkVideoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok && response.headers.get("content-type")?.includes("video/")
  } catch (error) {
    console.error("Error checking video URL:", error)
    return false
  }
}

/**
 * Properly encodes a video URL to handle spaces and special characters
 * @param url The URL to encode
 * @returns The encoded URL
 */
export function encodeVideoUrl(url: string): string {
  try {
    // Only encode if not already encoded
    if (url.includes(" ") && !url.includes("%20")) {
      return encodeURI(url)
    }
    return url
  } catch (error) {
    console.error("Error encoding URL:", error)
    return url
  }
}

/**
 * Formats video duration in seconds to MM:SS format
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

/**
 * Checks if the browser supports the video format
 * @param format The video format (e.g., 'video/mp4')
 * @returns True if the format is supported
 */
export function isVideoFormatSupported(format: string): boolean {
  const video = document.createElement("video")
  return video.canPlayType(format) !== ""
}

/**
 * Creates a proxy URL for videos with CORS issues
 * @param url The original video URL
 * @returns A proxy URL that bypasses CORS
 */
export function createProxyUrl(url: string): string {
  // This is a placeholder - in a real implementation, you would use your own proxy
  // or a service like Cloudflare Workers to proxy the video
  return `/api/video-proxy?url=${encodeURIComponent(url)}`
}
