import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { verifyDNSRecords } from "@/lib/dns-utils"
import { addVercelDomain } from "@/lib/vercel-api"
import { invalidateDomainCache } from "@/lib/custom-domain-cache"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    initializeFirebaseAdmin()

    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    await getAuth().verifyIdToken(token)

    const domainId = params.id
    console.log(`[v0] [Admin] Manual verification for domain: ${domainId}`)

    // Get domain document
    const domainDoc = await db.collection("customDomains").doc(domainId).get()

    if (!domainDoc.exists) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const domainData = domainDoc.data()!

    if (domainData.verified) {
      return NextResponse.json({ error: "Domain already verified" }, { status: 400 })
    }

    // Verify DNS records
    const dnsVerified = await verifyDNSRecords(domainData.domain, domainData.verificationToken, domainData.isApex)

    if (!dnsVerified.verified) {
      await db.collection("customDomains").doc(domainId).update({
        lastChecked: new Date().toISOString(),
        status: "pending",
      })

      return NextResponse.json(
        {
          error: "DNS verification failed",
          details: dnsVerified,
        },
        { status: 400 },
      )
    }

    // Add to Vercel
    const vercelResult = await addVercelDomain(domainData.domain)

    if (!vercelResult.success) {
      await db.collection("customDomains").doc(domainId).update({
        lastChecked: new Date().toISOString(),
        status: "failed",
      })

      return NextResponse.json(
        {
          error: "Failed to add to Vercel",
          details: vercelResult.error,
        },
        { status: 500 },
      )
    }

    // Update domain as verified
    const now = new Date().toISOString()
    await db.collection("customDomains").doc(domainId).update({
      verified: true,
      verifiedAt: now,
      lastChecked: now,
      status: "active",
      sslStatus: "pending",
    })

    // Invalidate cache and warm it up
    invalidateDomainCache(domainData.domain)

    console.log(`[v0] [Admin] Domain verified successfully: ${domainData.domain}`)

    return NextResponse.json({
      success: true,
      message: "Domain verified successfully",
      domain: {
        id: domainId,
        domain: domainData.domain,
        verified: true,
        status: "active",
      },
    })
  } catch (error: any) {
    console.error("[Admin Verify Domain] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to verify domain" }, { status: 500 })
  }
}
