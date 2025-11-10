import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { checkDomainStatus } from "@/lib/vercel-api"

initializeFirebaseAdmin()

/**
 * Cron job to check SSL certificate status for verified domains
 * Runs periodically to update SSL status from Vercel API
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    console.log(`[v0] [SSL Check Cron] Starting SSL certificate check at ${now.toISOString()}`)

    // Query domains that need SSL status checks
    // Check: verified domains with pending SSL OR domains checked more than 1 hour ago
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    let domainsSnapshot
    try {
      domainsSnapshot = await db
        .collection("customDomains")
        .where("verified", "==", true)
        .where("status", "==", "active")
        .get()
    } catch (error) {
      console.error("[v0] [SSL Check Cron] Error querying domains:", error)
      return NextResponse.json(
        {
          error: "Failed to query domains",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    if (domainsSnapshot.empty) {
      console.log("[v0] [SSL Check Cron] No active verified domains found")
      return NextResponse.json({
        success: true,
        message: "No active verified domains found",
        count: 0,
      })
    }

    console.log(`[v0] [SSL Check Cron] Found ${domainsSnapshot.size} verified domains to check`)

    const batch = db.batch()
    const updatedDomains: string[] = []
    const errors: Array<{ domain: string; error: string }> = []

    for (const doc of domainsSnapshot.docs) {
      const domainData = doc.data()
      const domainName = domainData.domain
      const lastChecked = domainData.lastChecked?.toDate()

      // Skip domains checked within the last hour unless SSL is pending
      if (domainData.sslStatus !== "pending" && lastChecked && lastChecked > oneHourAgo) {
        console.log(`[v0] [SSL Check Cron] Skipping ${domainName} - checked recently (${lastChecked.toISOString()})`)
        continue
      }

      try {
        let sslStatus: "pending" | "active" | "error" = "pending"
        let sslError: string | null = null

        console.log(`[v0] [SSL Check Cron] Checking Vercel status for ${domainName}`)
        const vercelStatus = await checkDomainStatus(domainName)
        console.log(`[v0] [SSL Check Cron] Vercel response for ${domainName}:`, vercelStatus)

        // Extract SSL/certificate verification status
        if (vercelStatus.verified) {
          // Domain is verified at Vercel level
          // Check if there's any SSL certificate verification info
          const sslVerification = vercelStatus.verification?.find((v) => v.type === "ssl" || v.type === "cert")

          if (sslVerification) {
            // SSL verification entry exists
            if (sslVerification.reason) {
              // There's an error or pending reason
              sslStatus = "error"
              sslError = sslVerification.reason
              console.log(`[v0] [SSL Check Cron] SSL error for ${domainName}: ${sslError}`)
            } else {
              // No error reason means it's likely active
              sslStatus = "active"
              console.log(`[v0] [SSL Check Cron] SSL active for ${domainName}`)
            }
          } else {
            // No SSL verification entry usually means it's active
            // (Vercel removes verification entries once successful)
            sslStatus = "active"
            console.log(`[v0] [SSL Check Cron] SSL active for ${domainName} (no verification entry)`)
          }
        } else {
          // Domain not verified at Vercel level
          sslStatus = "error"
          sslError = "Domain verification lost at Vercel"
          console.log(`[v0] [SSL Check Cron] Domain not verified at Vercel: ${domainName}`)
        }

        const updates: any = {
          sslStatus,
          lastChecked: now,
          updatedAt: now,
        }

        if (sslError) {
          updates.sslError = sslError
        } else {
          // Clear any previous error
          updates.sslError = null
        }

        batch.update(doc.ref, updates)
        updatedDomains.push(domainName)

        console.log(`[v0] [SSL Check Cron] Updated ${domainName}: ${domainData.sslStatus} → ${sslStatus}`)
      } catch (error: any) {
        console.error(`[v0] [SSL Check Cron] Error checking ${domainName}:`, error)
        errors.push({
          domain: domainName,
          error: error.message || "Unknown error",
        })

        // Update lastChecked even on error to prevent constant retries
        batch.update(doc.ref, {
          lastChecked: now,
        })
      }
    }

    if (updatedDomains.length > 0) {
      await batch.commit()
      console.log(`[v0] [SSL Check Cron] ✅ Updated SSL status for ${updatedDomains.length} domains`)
    } else {
      console.log("[v0] [SSL Check Cron] No domains needed SSL status updates")
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${domainsSnapshot.size} domains, updated ${updatedDomains.length}`,
      totalChecked: domainsSnapshot.size,
      updatedCount: updatedDomains.length,
      updatedDomains,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] [SSL Check Cron] Error checking SSL status:", error)
    return NextResponse.json(
      {
        error: "Failed to check SSL status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication for manual testing
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Re-use GET logic by calling it
    return GET(request)
  } catch (error) {
    console.error("[v0] [SSL Check Manual] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check SSL status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
