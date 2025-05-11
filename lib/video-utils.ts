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
 * Checks the format of a video file
 * @param url The URL of the video
 * @returns Promise that resolves to the content type or null if not found
 */
export async function checkVideoFormat(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    if (response.ok) {
      return response.headers.get("content-type")
    }
    return null
  } catch (error) {
    console.error("Error checking video format:", error)
    return null
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

/**
 * Gets detailed browser video support information
 * @returns Object with support information for different formats
 */
export function getBrowserVideoSupport() {
  const video = document.createElement("video")

  return {
    mp4: {
      h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
      h265: video.canPlayType('video/mp4; codecs="hev1"'),
    },
    webm: {
      vp8: video.canPlayType('video/webm; codecs="vp8"'),
      vp9: video.canPlayType('video/webm; codecs="vp9"'),
    },
    ogg: video.canPlayType("video/ogg"),
    hls: video.canPlayType("application/vnd.apple.mpegurl"),
  }
}

/**
 * Detects if the browser is Safari
 * @returns True if the browser is Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/**
 * Creates a video element with multiple source formats
 * @param url Base URL of the video
 * @returns HTML string with video element and multiple sources
 */
export function createMultiFormatVideo(url: string): string {
  return `
    <video controls>
      <source src="${url}" type="video/mp4">
      <source src="${url.replace(".mp4", ".webm")}" type="video/webm">
      <source src="${url.replace(".mp4", ".ogv")}" type="video/ogg">
      Your browser does not support the video tag.
    </video>
  `
}
