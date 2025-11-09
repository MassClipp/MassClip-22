import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { verifyDNSRecords } from "@/lib/dns-utils"
import { sendDomainHealthAlertEmail } from "@/lib/custom-domain-email-service"

export const maxDuration = 300 // 5 minutes

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    initializeFirebaseAdmin()

    console.log("[v0] Starting domain health check cron job")

    // Find all active verified domains
    // Check domains that haven't been health-checked in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const activeDomainsSnapshot = await db
      .collection("customDomains")
      .where("verified", "==", true)
      .where("status", "==", "active")
      .get()

    console.log(`[v0] Found ${activeDomainsSnapshot.size} active domains to check`)

    let healthyCount = 0
    let unhealthyCount = 0
    let errorCount = 0

    for (const domainDoc of activeDomainsSnapshot.docs) {
      const domainData = domainDoc.data()
      const domainId = domainDoc.id

      // Skip if checked recently (within last 24 hours)
      if (domainData.lastHealthCheck && domainData.lastHealthCheck > twentyFourHoursAgo) {
        console.log(`[v0] Skipping ${domainData.domain} - checked recently`)
        continue
      }

      console.log(`[v0] Health checking domain: ${domainData.domain}`)

      try {
        // Verify DNS records are still pointing correctly
        const verificationResult = await verifyDNSRecords(
          domainData.domain,
          domainData.verificationToken,
          domainData.isApex,
        )

        const now = new Date().toISOString()

        if (verificationResult.verified) {
          // Domain is healthy
          await db.collection("customDomains").doc(domainId).update({
            lastHealthCheck: now,
            healthStatus: "healthy",
            healthError: null,
          })

          console.log(`[v0] Domain ${domainData.domain} is healthy`)
          healthyCount++
        } else {
          // Domain has issues
          const issue = `DNS records not found or misconfigured: ${JSON.stringify(verificationResult)}`

          await db.collection("customDomains").doc(domainId).update({
            lastHealthCheck: now,
            healthStatus: "unhealthy",
            healthError: issue,
            status: "warning",
          })

          console.warn(`[v0] Domain ${domainData.domain} is unhealthy:`, issue)
          unhealthyCount++

          // Send alert email to user
          const userDoc = await db.collection("users").doc(domainData.userId).get()
          const userData = userDoc.data()

          if (userData?.email) {
            await sendDomainHealthAlertEmail(
              userData.email,
              domainData.domain,
              "DNS records appear to be misconfigured or removed",
              userData.displayName || userData.username,
            )
          }
        }
      } catch (error) {
        console.error(`[v0] Error checking domain ${domainData.domain}:`, error)
        errorCount++

        const now = new Date().toISOString()
        await db
          .collection("customDomains")
          .doc(domainId)
          .update({
            lastHealthCheck: now,
            healthStatus: "error",
            healthError: error instanceof Error ? error.message : "Unknown error during health check",
          })
      }
    }

    const summary = {
      total: activeDomainsSnapshot.size,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }

    console.log("[v0] Domain health check completed:", summary)

    return NextResponse.json({
      success: true,
      message: "Health check completed",
      summary,
    })
  } catch (error: any) {
    console.error("[v0] Domain health check cron error:", error)
    return NextResponse.json({ error: error.message || "Health check failed" }, { status: 500 })
  }
}
