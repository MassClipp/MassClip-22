/**
 * Test Mode for Custom Domains
 * Allows testing the entire custom domain flow without real DNS/Vercel API calls
 */

export const isTestMode = () => {
  return process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_TEST_MODE === "true"
}

export const isTestDomain = (domain: string) => {
  // Test domains follow pattern: test-*.example.com, *.test, localhost-*, contains localhost, or uses free DNS services
  const lowerDomain = domain.toLowerCase()

  // Free DNS services that are safe for testing
  const freeDnsServices = [
    "duckdns.org",
    "ddns.net",
    "noip.com",
    "dynu.com",
    "freedns.afraid.org",
    "example.com",
    "example.org",
  ]

  const isFreeDns = freeDnsServices.some((service) => lowerDomain.endsWith(service))

  return (
    lowerDomain.startsWith("test-") ||
    lowerDomain.startsWith("localhost") ||
    lowerDomain.endsWith(".test") ||
    lowerDomain.includes("localhost") ||
    isFreeDns
  )
}

// Mock DNS verification - auto-passes after 30 seconds
export const getMockDNSVerification = (domain: string, createdAt: string) => {
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
  const isOldEnough = createdAt <= thirtySecondsAgo

  return {
    txtRecordFound: isOldEnough,
    txtRecordValue: isOldEnough ? "vc-domain-verify=mock-value" : undefined,
    cnameRecordFound: isOldEnough,
    cnameRecordValue: isOldEnough ? "cname.vercel-dns.com" : undefined,
    verified: isOldEnough,
    testMode: true,
  }
}

// Mock Vercel API responses
export const getMockVercelResponse = (domain: string) => {
  return {
    name: domain,
    apexName: domain,
    projectId: "mock-project-id",
    verified: true,
    verification: [],
    testMode: true,
  }
}

// Mock SSL status - auto-provisions after 1 minute
export const getMockSSLStatus = (verifiedAt: string | null) => {
  if (!verifiedAt) {
    return { sslStatus: "pending", sslError: null }
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const isOldEnough = verifiedAt <= oneMinuteAgo

  return {
    sslStatus: isOldEnough ? "active" : "pending",
    sslError: null,
    testMode: true,
  }
}
