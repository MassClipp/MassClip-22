/**
 * Utility functions for browser detection
 */

// Detect if the user is browsing from TikTok's in-app browser
export function isInTikTokBrowser(): boolean {
  if (typeof window === "undefined") return false

  const userAgent = navigator.userAgent.toLowerCase()

  // TikTok's in-app browser typically contains 'tiktok' in the user agent
  // It may appear as "TikTok" or "musical_ly" (older versions)
  return (
    userAgent.includes("tiktok") ||
    userAgent.includes("musical_ly") ||
    // Additional check for ByteDance's browser engine
    userAgent.includes("bytedance")
  )
}

// Get a more general classification of the browser environment
export function getBrowserEnvironment() {
  if (typeof window === "undefined") return "server"

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes("tiktok") || ua.includes("musical_ly") || ua.includes("bytedance")) {
    return "tiktok"
  } else if (ua.includes("instagram")) {
    return "instagram"
  } else if (ua.includes("fbav") || ua.includes("fban")) {
    return "facebook"
  } else if (ua.includes("twitter") || ua.includes("x-twitter")) {
    return "twitter"
  } else if (ua.includes("snapchat")) {
    return "snapchat"
  } else {
    return "standard"
  }
}
