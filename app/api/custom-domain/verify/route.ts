import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { verifyDNSRecords } from "@/lib/dns-utils"
import { addDomainToVercel } from "@/lib/vercel-api"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin()

    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { domainId } = await request.json()

    if (!domainId) {
      return NextResponse.json({ error: "Domain ID is required" }, { status: 400 })
    }

    // Get domain document
    const domainDoc = await db.collection("customDomains").doc(domainId).get()

    if (!domainDoc.exists) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const domainData = domainDoc.data()

    if (domainData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (domainData.verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Domain already verified",
      })
    }

    // Verify DNS records
    const verificationResult = await verifyDNSRecords(
      domainData.domain,
      domainData.verificationToken,
      domainData.isApex,
    )

    const now = new Date().toISOString()

    if (verificationResult.verified) {
      // Add domain to Vercel
      try {
        await addDomainToVercel(domainData.domain)
      } catch (error: any) {
        console.error("[Custom Domain Verify] Vercel API error:", error)

        // Update status to failed
        await db.collection("customDomains").doc(domainId).update({
          status: "failed",
          lastChecked: now,
        })

        return NextResponse.json({
          success: false,
          verified: false,
          error: "Domain verification passed but failed to add to Vercel. Please try again.",
        })
      }

      // Update domain document
      await db.collection("customDomains").doc(domainId).update({
        verified: true,
        verifiedAt: now,
        lastChecked: now,
        status: "active",
        sslStatus: "active",
      })

      // Update user document
      await db.collection("users").doc(userId).update({
        customDomain: domainData.domain,
        customDomainId: domainId,
      })

      console.log(`[v0] Domain verified successfully: ${domainData.domain} (ID: ${domainId})`)

      // Invalidate cache for this domain by making a request to the resolve endpoint
      try {
        // This will populate the cache with the new verified domain
        await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/custom-domain/resolve?customDomain=${domainData.domain}&originalPath=/`,
          {
            method: "GET",
          },
        )
      } catch (cacheError) {
        console.error("[v0] Cache warm-up failed:", cacheError)
      }

      // Send verification email
      const userDoc = await db.collection("users").doc(userId).get()
      const userData = userDoc.data()

      if (userData?.email) {
        try {
          await resend.emails.send({
            from: "MassClip <noreply@massclip.pro>",
            to: userData.email,
            subject: "Your Custom Domain is Live!",
            html: `
              <h1>Custom Domain Verified</h1>
              <p>Great news! Your custom domain <strong>${domainData.domain}</strong> has been verified and is now live.</p>
              <p>Your storefront is now accessible at:</p>
              <p><a href="https://${domainData.domain}" style="color: #3b82f6;">https://${domainData.domain}</a></p>
              <p>SSL certificates may take up to 24 hours to fully provision.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #6b7280; font-size: 14px;">MassClip - Professional Creator Platform</p>
            `,
          })
        } catch (emailError) {
          console.error("[Custom Domain Verify] Email send error:", emailError)
          // Don't fail the verification if email fails
        }
      }

      return NextResponse.json({
        success: true,
        verified: true,
        domain: domainData.domain,
        message: "Domain verified successfully!",
      })
    } else {
      // Update last checked time
      await db.collection("customDomains").doc(domainId).update({
        status: "verifying",
        lastChecked: now,
      })

      return NextResponse.json({
        success: false,
        verified: false,
        verificationResult,
        message: "DNS records not found yet. Please wait a few minutes and try again.",
      })
    }
  } catch (error: any) {
    console.error("[Custom Domain Verify] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to verify custom domain" }, { status: 500 })
  }
}
