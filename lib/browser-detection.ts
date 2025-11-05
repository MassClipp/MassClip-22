/**
 * Utility functions to detect browser environments
 */

// Check if the current browser is TikTok's in-app browser
export const isInTikTokBrowser = (): boolean => {
  if (typeof window === "undefined") return false

  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes("tiktok") || userAgent.includes("musical_ly") || userAgent.includes("bytedance")
}

// Get the current browser environment
export const getBrowserEnvironment = (): string => {
  if (typeof window === "undefined") return "server"

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes("tiktok") || ua.includes("musical_ly") || ua.includes("bytedance")) {
    return "tiktok"
  } else if (ua.includes("instagram")) {
    return "instagram"
  } else if (ua.includes("facebook") || ua.includes("fb")) {
    return "facebook"
  } else if (ua.includes("twitter")) {
    return "twitter"
  } else if (ua.includes("snapchat")) {
    return "snapchat"
  } else if (ua.includes("wechat")) {
    return "wechat"
  } else {
    return "standard"
  }
}

// Check if we're in any in-app browser
export const isInAppBrowser = (): boolean => {
  return getBrowserEnvironment() !== "standard" && getBrowserEnvironment() !== "server"
}
