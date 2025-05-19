/**
 * Utility functions for video handling
 */

/**
 * Tests if a video URL is accessible
 * @param url The URL to test
 * @returns A promise that resolves to an object with status and message
 */
export async function testVideoUrl(url: string): Promise<{ success: boolean; status?: number; message: string }> {
  if (!url) {
    return { success: false, message: "No URL provided" }
  }

  try {
    const response = await fetch(url, { method: "HEAD" })

    if (response.ok) {
      return {
        success: true,
        status: response.status,
        message: `URL is accessible (Status: ${response.status})`,
      }
    } else {
      return {
        success: false,
        status: response.status,
        message: `URL returned error status: ${response.status} ${response.statusText}`,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Checks if a URL is a Cloudflare R2 URL
 * @param url The URL to check
 * @returns True if the URL is a Cloudflare R2 URL
 */
export function isCloudflareR2Url(url: string): boolean {
  if (!url) return false
  return url.includes("r2.dev") || url.includes("cloudflare")
}

/**
 * Gets the appropriate video type based on the URL
 * @param url The video URL
 * @returns The MIME type for the video
 */
export function getVideoType(url: string): string {
  if (!url) return "video/mp4" // Default

  const extension = url.split(".").pop()?.toLowerCase()

  switch (extension) {
    case "mp4":
      return "video/mp4"
    case "webm":
      return "video/webm"
    case "ogg":
      return "video/ogg"
    case "mov":
      return "video/quicktime"
    default:
      return "video/mp4" // Default to MP4
  }
}

/**
 * Checks if a video format is widely supported across browsers
 * @param url The video URL
 * @returns True if the format is widely supported
 */
export function isWidelySupported(url: string): boolean {
  if (!url) return false

  const extension = url.split(".").pop()?.toLowerCase()
  return extension === "mp4" || extension === "webm"
}
