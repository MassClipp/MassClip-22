import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { isApexDomain, getDNSInstructions } from "@/lib/dns-utils"
import { checkDomainRateLimit, checkDomainSecurity } from "@/lib/custom-domain-rate-limiter"
import { isTestMode, isTestDomain } from "@/lib/custom-domain-test-mode"

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

    const rateLimitCheck = await checkDomainRateLimit(userId, "add")
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.message,
          resetIn: rateLimitCheck.resetIn,
        },
        { status: 429 },
      )
    }

    // Check user is Facelessprenuer
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    const testModeActive = isTestMode() && isTestDomain(domain)

    if (!testModeActive) {
      const membershipTier = userData.plan || userData.membershipTier || "free"
      console.log("[v0] Custom domain add - membership check:", {
        membershipTier,
        userData: { plan: userData.plan, membershipTier: userData.membershipTier },
      })

      if (membershipTier !== "facelessprenuer") {
        return NextResponse.json({ error: "Custom domains require Facelessprenuer membership" }, { status: 403 })
      }
    }

    if (testModeActive) {
      console.log(`[Custom Domain Add] [TEST MODE] Adding test domain: ${domain}`)
    } else {
      // Existing validation
      const securityCheck = await checkDomainSecurity(userId, domain)
      if (!securityCheck.safe) {
        return NextResponse.json({ error: securityCheck.reason }, { status: 403 })
      }

      // Validate domain format
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
      if (!domainRegex.test(domain)) {
        return NextResponse.json({ error: "Invalid domain format" }, { status: 400 })
      }

      // Prevent using massclip.com subdomains
      if (domain.includes("massclip.com") || domain.includes("massclip.pro")) {
        return NextResponse.json({ error: "Cannot use MassClip domains" }, { status: 400 })
      }
    }

    // Check if domain already exists (active domains)
    const existingDomainQuery = await db.collection("customDomains").where("domain", "==", domain.toLowerCase()).get()

    // Filter out removed domains in memory to avoid complex composite index
    const activeDomains = existingDomainQuery.docs.filter((doc) => doc.data().status !== "removed")

    if (activeDomains.length > 0) {
      return NextResponse.json({ error: "Domain already in use" }, { status: 409 })
    }

    const userDomainQuery = await db.collection("customDomains").where("userId", "==", userId).get()

    // Filter out removed domains in memory
    const activeUserDomains = userDomainQuery.docs.filter((doc) => doc.data().status !== "removed")

    if (activeUserDomains.length > 0) {
      return NextResponse.json(
        { error: "You already have a custom domain. Remove it first to add a new one." },
        { status: 409 },
      )
    }

    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const hexToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const verificationToken = `vc-domain-verify=${hexToken}`

    const isApex = isApexDomain(domain)
    const dnsInstructions = getDNSInstructions(domain, verificationToken, isApex)

    // Create custom domain document
    const now = new Date().toISOString()
    const domainDoc = {
      userId,
      domain: domain.toLowerCase(),
      verified: false,
      verificationToken,
      createdAt: now,
      verifiedAt: null,
      lastChecked: now,
      status: "pending",
      sslStatus: "pending",
      isApex,
    }

    const docRef = await db.collection("customDomains").add(domainDoc)

    console.log(`[v0] Custom domain added successfully: ${domain} (ID: ${docRef.id})`)

    return NextResponse.json({
      success: true,
      domainId: docRef.id,
      domain: {
        id: docRef.id,
        domain: domain.toLowerCase(),
        status: "pending",
        verificationToken,
        isApex,
      },
      verificationToken,
      dnsInstructions,
      isApex,
    })
  } catch (error: any) {
    console.error("[Custom Domain Add] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to add custom domain" }, { status: 500 })
  }
}
