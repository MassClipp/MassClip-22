import { db } from "@/lib/firebase-admin"

interface DomainAttempt {
  userId: string
  timestamp: number
  operation: "add" | "verify" | "remove"
  domain?: string
}

// In-memory cache for rate limiting (consider Redis for production)
const attemptCache = new Map<string, DomainAttempt[]>()

const MAX_ADD_ATTEMPTS_PER_HOUR = 5
const MAX_VERIFY_ATTEMPTS_PER_HOUR = 20
const MAX_REMOVE_ATTEMPTS_PER_HOUR = 3
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export async function checkDomainRateLimit(
  userId: string,
  operation: "add" | "verify" | "remove",
  domain?: string,
): Promise<{ allowed: boolean; remaining: number; resetIn?: number; message?: string }> {
  const key = `${userId}:${operation}`
  const now = Date.now()

  // Get attempts from cache
  if (!attemptCache.has(key)) {
    attemptCache.set(key, [])
  }

  const attempts = attemptCache.get(key)!
  const recentAttempts = attempts.filter((a) => now - a.timestamp < ATTEMPT_WINDOW_MS)

  // Determine max attempts based on operation
  let maxAttempts = MAX_ADD_ATTEMPTS_PER_HOUR
  if (operation === "verify") maxAttempts = MAX_VERIFY_ATTEMPTS_PER_HOUR
  if (operation === "remove") maxAttempts = MAX_REMOVE_ATTEMPTS_PER_HOUR

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = recentAttempts[0]
    const resetIn = Math.ceil((oldestAttempt.timestamp + ATTEMPT_WINDOW_MS - now) / 1000)

    console.log(`[v0] Rate limit exceeded for user ${userId} on ${operation}: ${recentAttempts.length}/${maxAttempts}`)

    return {
      allowed: false,
      remaining: 0,
      resetIn,
      message: `Too many ${operation} attempts. Please try again in ${Math.ceil(resetIn / 60)} minutes.`,
    }
  }

  // Track new attempt
  recentAttempts.push({ userId, timestamp: now, operation, domain })
  attemptCache.set(key, recentAttempts)

  // Log attempt to database for persistent tracking
  try {
    await db.collection("customDomainAttempts").add({
      userId,
      operation,
      domain,
      timestamp: new Date(),
      success: true,
    })
  } catch (error) {
    console.error("[v0] Failed to log domain attempt:", error)
  }

  return {
    allowed: true,
    remaining: maxAttempts - recentAttempts.length,
  }
}

// Security check for suspicious patterns
export async function checkDomainSecurity(userId: string, domain: string): Promise<{ safe: boolean; reason?: string }> {
  const whitelistedProviders = [/\.duckdns\.org$/i, /\.mooo\.com$/i, /\.freedns\.afraid\.org$/i]

  const isWhitelisted = whitelistedProviders.some((pattern) => pattern.test(domain))
  console.log(`[v0] Domain whitelist check: ${domain}, whitelisted: ${isWhitelisted}`)

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /phishing/i,
    /malware/i,
    /spam/i,
    /scam/i,
    /hack/i,
    /exploit/i,
    // Add common typosquatting patterns
    /m[a4]ssclip/i,
    /massci[i1]p/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(domain)) {
      console.warn(`[v0] Suspicious domain pattern detected: ${domain}`)
      return {
        safe: false,
        reason: "Domain contains suspicious keywords and has been flagged for review.",
      }
    }
  }

  // Check for excessive subdomain nesting
  const subdomainCount = domain.split(".").length - 2
  if (subdomainCount > 3) {
    return {
      safe: false,
      reason: "Domain has too many subdomain levels.",
    }
  }

  // Check if user has history of abuse
  const userDomainsSnapshot = await db
    .collection("customDomains")
    .where("userId", "==", userId)
    .where("status", "==", "banned")
    .get()

  if (userDomainsSnapshot.size > 0) {
    console.warn(`[v0] User ${userId} has ${userDomainsSnapshot.size} banned domains`)
    return {
      safe: false,
      reason: "Account has been flagged for previous domain abuse.",
    }
  }

  return { safe: true }
}
