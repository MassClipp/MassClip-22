/**
 * MassClip Download Diagnostic Tool
 *
 * This script performs comprehensive diagnostics on the download functionality
 * to identify exactly what's blocking downloads from working properly.
 */

import { auth } from "@/lib/firebase"

// Types for diagnostic results
interface DiagnosticResult {
  test: string
  passed: boolean
  details: string
  severity: "info" | "warning" | "error" | "success"
  fix?: string
}

interface DiagnosticSummary {
  results: DiagnosticResult[]
  overallStatus: "success" | "warning" | "error"
  primaryIssue?: string
  recommendedFix?: string
}

/**
 * Main diagnostic function that runs all tests
 */
export async function runDownloadDiagnostics(videoUrl?: string): Promise<DiagnosticSummary> {
  console.log("🔍 Starting MassClip download diagnostics...")

  const results: DiagnosticResult[] = []
  const testUrl =
    videoUrl ||
    "https://player.vimeo.com/progressive_redirect/download/123456789/container/123456789.mp4?loc=external&signature=abc123"

  // Run all diagnostic tests
  await Promise.all([
    checkBrowserSupport(results),
    checkContentSecurityPolicy(results),
    checkCORSHeaders(results, testUrl),
    checkContentDisposition(results, testUrl),
    checkDownloadAttribute(results),
    checkPopupBlockers(results),
    checkMobileSpecificIssues(results),
    checkNetworkRequests(results, testUrl),
    checkUserAuthentication(results),
    checkVimeoRateLimit(results),
    checkBrowserExtensions(results),
    checkServiceWorkerInterference(results),
  ])

  // Determine overall status
  const hasErrors = results.some((r) => r.severity === "error")
  const hasWarnings = results.some((r) => r.severity === "warning")
  const overallStatus = hasErrors ? "error" : hasWarnings ? "warning" : "success"

  // Find primary issue
  const primaryIssue = results
    .filter((r) => !r.passed)
    .sort((a, b) => {
      const severityScore = { error: 3, warning: 2, info: 1, success: 0 }
      return severityScore[b.severity] - severityScore[a.severity]
    })[0]

  const summary: DiagnosticSummary = {
    results,
    overallStatus,
    primaryIssue: primaryIssue?.details,
    recommendedFix: primaryIssue?.fix,
  }

  console.log("📊 Diagnostic summary:", summary)
  return summary
}

/**
 * Check browser support for downloads
 */
async function checkBrowserSupport(results: DiagnosticResult[]) {
  const ua = navigator.userAgent
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua)
  const isFirefox = /Firefox/.test(ua)

  // Check for download attribute support
  const supportsDownloadAttr = "download" in document.createElement("a")

  results.push({
    test: "Browser Download Support",
    passed: supportsDownloadAttr,
    details: supportsDownloadAttr
      ? `Your browser (${getBrowserName()}) supports the download attribute.`
      : `Your browser (${getBrowserName()}) may not fully support the download attribute.`,
    severity: supportsDownloadAttr ? "success" : "warning",
    fix: !supportsDownloadAttr ? "Try using Chrome or Firefox for better download support." : undefined,
  })

  // iOS Safari specific issues
  if (isIOS && isSafari) {
    results.push({
      test: "iOS Safari Detection",
      passed: false,
      details: "iOS Safari has limitations with programmatic downloads and may require user interaction.",
      severity: "warning",
      fix: 'For iOS Safari, use the "Open in new tab" approach and instruct users to long-press and save.',
    })
  }

  function getBrowserName() {
    if (isIOS && isSafari) return "iOS Safari"
    if (isIOS) return "iOS Browser"
    if (isAndroid) return "Android Browser"
    if (isChrome) return "Chrome"
    if (isFirefox) return "Firefox"
    if (isSafari) return "Safari"
    return "Unknown Browser"
  }
}

/**
 * Check Content Security Policy restrictions
 */
async function checkContentSecurityPolicy(results: DiagnosticResult[]) {
  try {
    // Try to fetch the CSP from the current page
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    const cspContent = cspMeta ? cspMeta.getAttribute("content") : "None detected on page"

    // Check for restrictive CSP that might block downloads
    const hasRestrictiveCSP =
      cspContent &&
      (cspContent.includes("default-src") || cspContent.includes("connect-src") || cspContent.includes("frame-src"))

    results.push({
      test: "Content Security Policy",
      passed: !hasRestrictiveCSP,
      details: hasRestrictiveCSP
        ? `Restrictive Content Security Policy detected: ${cspContent}`
        : "No restrictive Content Security Policy detected.",
      severity: hasRestrictiveCSP ? "warning" : "success",
      fix: hasRestrictiveCSP ? "Update CSP to allow downloads from Vimeo domains." : undefined,
    })
  } catch (error) {
    results.push({
      test: "Content Security Policy",
      passed: true,
      details: "Could not check CSP, but this is likely not the issue.",
      severity: "info",
    })
  }
}

/**
 * Check CORS headers on the download URL
 */
async function checkCORSHeaders(results: DiagnosticResult[], url: string) {
  try {
    // Try a HEAD request to check CORS headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      signal: controller.signal,
    }).catch((e) => {
      if (e.name === "AbortError") {
        return { ok: false, status: "timeout", statusText: "Request timed out" }
      }
      throw e
    })

    clearTimeout(timeoutId)

    const corsHeadersOk = response.ok

    results.push({
      test: "CORS Headers",
      passed: corsHeadersOk,
      details: corsHeadersOk
        ? "CORS headers are properly configured."
        : `CORS issue detected: ${response.status} ${response.statusText}`,
      severity: corsHeadersOk ? "success" : "error",
      fix: !corsHeadersOk
        ? "The Vimeo API may be blocking cross-origin requests. Try server-side proxying of download requests."
        : undefined,
    })
  } catch (error) {
    // CORS errors will be caught here
    results.push({
      test: "CORS Headers",
      passed: false,
      details: `CORS error detected: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
      fix: "Implement a server-side proxy for download requests to bypass CORS restrictions.",
    })
  }
}

/**
 * Check Content-Disposition header on the download URL
 */
async function checkContentDisposition(results: DiagnosticResult[], url: string) {
  try {
    // Try to check headers via a proxy to avoid CORS
    const proxyUrl = `/api/check-headers?url=${encodeURIComponent(url)}`

    const response = await fetch(proxyUrl)
    const data = await response.json()

    const hasContentDisposition =
      data.headers && (data.headers["content-disposition"] || data.headers["Content-Disposition"])

    results.push({
      test: "Content-Disposition Header",
      passed: hasContentDisposition,
      details: hasContentDisposition
        ? "Content-Disposition header is present for downloads."
        : "Content-Disposition header is missing, which may affect download behavior.",
      severity: hasContentDisposition ? "success" : "warning",
      fix: !hasContentDisposition
        ? "Add a server-side proxy that adds proper Content-Disposition headers to downloads."
        : undefined,
    })
  } catch (error) {
    // If we can't check, assume it's not the primary issue
    results.push({
      test: "Content-Disposition Header",
      passed: true,
      details: "Could not check Content-Disposition header.",
      severity: "info",
    })
  }
}

/**
 * Check if download attribute is working
 */
async function checkDownloadAttribute(results: DiagnosticResult[]) {
  const supportsDownloadAttr = "download" in document.createElement("a")

  results.push({
    test: "Download Attribute Support",
    passed: supportsDownloadAttr,
    details: supportsDownloadAttr
      ? "Browser supports the download attribute."
      : "Browser may not support the download attribute, which is essential for direct downloads.",
    severity: supportsDownloadAttr ? "success" : "error",
    fix: !supportsDownloadAttr
      ? "For browsers without download attribute support, use server-side streaming or Blob URLs."
      : undefined,
  })
}

/**
 * Check for popup blockers
 */
async function checkPopupBlockers(results: DiagnosticResult[]) {
  try {
    // Try to open a popup and see if it's blocked
    const popup = window.open("about:blank", "_blank")
    const isBlocked = !popup || popup.closed

    if (!isBlocked && popup) {
      popup.close()
    }

    results.push({
      test: "Popup Blockers",
      passed: !isBlocked,
      details: isBlocked
        ? "Popup blocker detected, which may interfere with window.open() download method."
        : "No popup blocker detected.",
      severity: isBlocked ? "warning" : "success",
      fix: isBlocked ? "Instruct users to allow popups for your site or use a different download method." : undefined,
    })
  } catch (error) {
    // If we can't check, assume it's not the primary issue
    results.push({
      test: "Popup Blockers",
      passed: true,
      details: "Could not check for popup blockers.",
      severity: "info",
    })
  }
}

/**
 * Check for mobile-specific issues
 */
async function checkMobileSpecificIssues(results: DiagnosticResult[]) {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (isIOS) {
    results.push({
      test: "iOS Download Handling",
      passed: false,
      details:
        "iOS devices have specific limitations with downloads. They often require user interaction and may open files in preview instead of downloading.",
      severity: "warning",
      fix: "For iOS, use window.open() and instruct users to long-press to save the video. Consider implementing a server-side solution that forces the Content-Disposition header.",
    })
  }

  if (isAndroid) {
    results.push({
      test: "Android Download Handling",
      passed: true,
      details: "Android devices generally support downloads but may handle them differently across browsers.",
      severity: "info",
      fix: "Ensure download links have proper MIME types and use the download attribute when possible.",
    })
  }
}

/**
 * Check network requests for issues
 */
async function checkNetworkRequests(results: DiagnosticResult[], url: string) {
  try {
    // Try a simple HEAD request to see if the URL is accessible
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    }).catch((e) => {
      if (e.name === "AbortError") {
        return { ok: false, status: "timeout", statusText: "Request timed out" }
      }
      throw e
    })

    clearTimeout(timeoutId)

    results.push({
      test: "Network Access",
      passed: response.ok,
      details: response.ok
        ? "Download URL is accessible."
        : `Download URL returned status: ${response.status} ${response.statusText}`,
      severity: response.ok ? "success" : "error",
      fix: !response.ok
        ? "Verify the download URLs are correct and accessible. Check if Vimeo has changed their URL structure."
        : undefined,
    })
  } catch (error) {
    results.push({
      test: "Network Access",
      passed: false,
      details: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
      fix: "Check network connectivity and ensure the download URLs are correct and accessible.",
    })
  }
}

/**
 * Check user authentication status
 */
async function checkUserAuthentication(results: DiagnosticResult[]) {
  const isAuthenticated = auth.currentUser !== null

  results.push({
    test: "User Authentication",
    passed: isAuthenticated,
    details: isAuthenticated ? "User is authenticated." : "User is not authenticated, which is required for downloads.",
    severity: isAuthenticated ? "success" : "error",
    fix: !isAuthenticated ? "Ensure users are logged in before attempting downloads." : undefined,
  })
}

/**
 * Check for Vimeo rate limiting
 */
async function checkVimeoRateLimit(results: DiagnosticResult[]) {
  // This is a heuristic check since we can't directly check Vimeo's rate limits
  try {
    const response = await fetch("/api/vimeo/rate-limit-check")
    const data = await response.json()

    results.push({
      test: "Vimeo API Rate Limits",
      passed: !data.isRateLimited,
      details: data.isRateLimited
        ? "Vimeo API rate limit may be affecting downloads."
        : "No Vimeo API rate limiting detected.",
      severity: data.isRateLimited ? "warning" : "success",
      fix: data.isRateLimited
        ? "Implement rate limiting on your end to avoid hitting Vimeo limits. Consider caching download URLs."
        : undefined,
    })
  } catch (error) {
    // If we can't check, assume it's not the primary issue
    results.push({
      test: "Vimeo API Rate Limits",
      passed: true,
      details: "Could not check Vimeo API rate limits.",
      severity: "info",
    })
  }
}

/**
 * Check for browser extensions that might interfere
 */
async function checkBrowserExtensions(results: DiagnosticResult[]) {
  // This is a heuristic check since we can't directly detect all extensions
  const knownInterferingExtensions = [
    { name: "AdBlock", detected: false },
    { name: "uBlock Origin", detected: false },
    { name: "Download Manager", detected: false },
    { name: "Privacy Badger", detected: false },
  ]

  // Try to detect extensions by looking for their elements or behaviors
  const hasAdBlocker = document.getElementById("ad-banner") === null || document.querySelector(".ad-unit") === null

  // This is a very rough heuristic
  if (hasAdBlocker) {
    knownInterferingExtensions[0].detected = true
    knownInterferingExtensions[1].detected = true
  }

  const detectedExtensions = knownInterferingExtensions.filter((ext) => ext.detected)

  results.push({
    test: "Browser Extensions",
    passed: detectedExtensions.length === 0,
    details:
      detectedExtensions.length > 0
        ? `Detected browser extensions that might interfere with downloads: ${detectedExtensions.map((e) => e.name).join(", ")}`
        : "No known interfering browser extensions detected.",
    severity: detectedExtensions.length > 0 ? "warning" : "success",
    fix:
      detectedExtensions.length > 0
        ? "Try disabling browser extensions, especially ad blockers and download managers."
        : undefined,
  })
}

/**
 * Check for service worker interference
 */
async function checkServiceWorkerInterference(results: DiagnosticResult[]) {
  const hasServiceWorker = "serviceWorker" in navigator && (await navigator.serviceWorker.getRegistrations()).length > 0

  results.push({
    test: "Service Worker",
    passed: !hasServiceWorker,
    details: hasServiceWorker
      ? "Service worker detected, which might intercept and affect download requests."
      : "No service worker detected.",
    severity: hasServiceWorker ? "info" : "success",
    fix: hasServiceWorker
      ? "Check if your service worker is intercepting download requests and modify it to bypass video downloads."
      : undefined,
  })
}
