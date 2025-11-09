import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { verifyDNSRecords } from "@/lib/dns-utils"
import { addDomainToVercel } from "@/lib/vercel-api"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export const maxDuration = 300 // 5 minutes

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    initializeFirebaseAdmin()

    console.log("[v0] Starting auto-verify-pending cron job")

    // Find all unverified domains that:
    // 1. Status is 'verifying' or 'pending'
    // 2. Created more than 5 minutes ago (DNS propagation time)
    // 3. Last checked more than 30 minutes ago (to avoid too frequent checks)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const pendingDomainsSnapshot = await db
      .collection("customDomains")
      .where("verified", "==", false)
      .where("status", "in", ["verifying", "pending"])
      .where("createdAt", "<=", fiveMinutesAgo)
      .get()

    console.log(`[v0] Found ${pendingDomainsSnapshot.size} pending domains to check`)

    let verifiedCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (const domainDoc of pendingDomainsSnapshot.docs) {
      const domainData = domainDoc.data()
      const domainId = domainDoc.id

      // Skip if checked recently
      if (domainData.lastChecked && domainData.lastChecked > thirtyMinutesAgo) {
        console.log(`[v0] Skipping ${domainData.domain} - checked recently`)
        skippedCount++
        continue
      }

      console.log(`[v0] Checking domain: ${domainData.domain}`)

      try {
        // Verify DNS records
        const verificationResult = await verifyDNSRecords(
          domainData.domain,
          domainData.verificationToken,
          domainData.isApex,
        )

        const now = new Date().toISOString()

        if (verificationResult.verified) {
          console.log(`[v0] DNS verified for ${domainData.domain}, adding to Vercel`)

          // Add domain to Vercel
          try {
            await addDomainToVercel(domainData.domain)

            // Update domain document
            await db.collection("customDomains").doc(domainId).update({
              verified: true,
              verifiedAt: now,
              lastChecked: now,
              status: "active",
              sslStatus: "pending",
            })

            // Update user document
            await db.collection("users").doc(domainData.userId).update({
              customDomain: domainData.domain,
              customDomainId: domainId,
            })

            console.log(`[v0] Domain verified successfully: ${domainData.domain}`)
            verifiedCount++

            // Warm up cache
            try {
              await fetch(
                `${process.env.NEXT_PUBLIC_SITE_URL}/api/custom-domain/resolve?customDomain=${domainData.domain}&originalPath=/`,
                { method: "GET" },
              )
            } catch (cacheError) {
              console.error("[v0] Cache warm-up failed:", cacheError)
            }

            // Send verification email
            const userDoc = await db.collection("users").doc(domainData.userId).get()
            const userData = userDoc.data()

            if (userData?.email) {
              try {
                await resend.emails.send({
                  from: "MassClip <noreply@massclip.pro>",
                  to: userData.email,
                  subject: "Your Custom Domain is Live!",
                  html: `
                    <h1>Custom Domain Verified</h1>
                    <p>Great news! Your custom domain <strong>${domainData.domain}</strong> has been automatically verified and is now live.</p>
                    <p>Your storefront is now accessible at:</p>
                    <p><a href="https://${domainData.domain}" style="color: #3b82f6;">https://${domainData.domain}</a></p>
                    <p>SSL certificates may take up to 24 hours to fully provision.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
                    <p style="color: #6b7280; font-size: 14px;">MassClip - Professional Creator Platform</p>
                  `,
                })
              } catch (emailError) {
                console.error("[v0] Email send error:", emailError)
              }
            }
          } catch (vercelError) {
            console.error(`[v0] Vercel API error for ${domainData.domain}:`, vercelError)

            // Update status to failed
            await db.collection("customDomains").doc(domainId).update({
              status: "failed",
              lastChecked: now,
            })

            failedCount++
          }
        } else {
          // Not verified yet, update last checked time
          console.log(`[v0] DNS not verified yet for ${domainData.domain}:`, verificationResult)

          await db.collection("customDomains").doc(domainId).update({
            status: "verifying",
            lastChecked: now,
          })
        }
      } catch (error) {
        console.error(`[v0] Error checking domain ${domainData.domain}:`, error)
        failedCount++
      }
    }

    const summary = {
      total: pendingDomainsSnapshot.size,
      verified: verifiedCount,
      failed: failedCount,
      skipped: skippedCount,
      timestamp: new Date().toISOString(),
    }

    console.log("[v0] Auto-verify-pending cron job completed:", summary)

    return NextResponse.json({
      success: true,
      message: "Auto-verify completed",
      summary,
    })
  } catch (error: any) {
    console.error("[v0] Auto-verify-pending cron error:", error)
    return NextResponse.json({ error: error.message || "Cron job failed" }, { status: 500 })
  }
}
