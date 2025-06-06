/**
 * Utility functions to help diagnose and resolve Vercel security checkpoint issues
 */

// Check if the current error is likely a Vercel security checkpoint
export function isVercelSecurityError(errorCode?: string | number): boolean {
  // Code 10 is commonly associated with Vercel security checkpoints
  return errorCode === 10 || errorCode === "10"
}

// Clear all security-related cookies
export function clearSecurityCookies(): void {
  if (typeof document === "undefined") return

  const cookiesToClear = ["_vercel_jwt", "_vercel_challenge", "_vercel_security", "_vercel_checkpoint"]

  cookiesToClear.forEach((cookieName) => {
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.massclip.pro`
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  })
}

// Get browser fingerprint information for diagnostics
export function getBrowserFingerprint(): Record<string, any> {
  if (typeof window === "undefined") return {}

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    platform: navigator.platform,
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
  }
}

// Check if the user is in incognito/private browsing mode
export async function isIncognitoMode(): Promise<boolean> {
  if (typeof window === "undefined") return false

  try {
    // Try to use IndexedDB which is often disabled in incognito mode
    const db = window.indexedDB.open("test")
    await new Promise((resolve, reject) => {
      db.onerror = () => resolve(true) // Likely incognito
      db.onsuccess = () => resolve(false) // Not incognito
    })
    return false
  } catch (e) {
    // If there's an error, it's likely incognito mode
    return true
  }
}
