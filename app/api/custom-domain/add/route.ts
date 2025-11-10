import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { isApexDomain, getDNSInstructions } from "@/lib/dns-utils"
import { checkDomainRateLimit, checkDomainSecurity } from "@/lib/custom-domain-rate-limiter"
import { isTestMode, isTestDomain } from "@/lib/custom-domain-test-mode"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] === Custom Domain Add API Called ===")
    initializeFirebaseAdmin()

    const authHeader = request.headers.get("Authorization")
    console.log("[v0] Auth header present:", !!authHeader)
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[v0] Missing or invalid auth header - returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid
    console.log("[v0] User authenticated:", userId)

    let domain: string
    try {
      const body = await request.json()
      domain = body.domain
      console.log("[v0] Domain received:", domain)
    } catch (error) {
      console.log("[v0] Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    if (!domain) {
      console.log("[v0] Domain missing - returning 400")
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    const rateLimitCheck = await checkDomainRateLimit(userId, "add")
    console.log("[v0] Rate limit check:", rateLimitCheck)
    if (!rateLimitCheck.allowed) {
      console.log("[v0] Rate limit exceeded - returning 429")
      return NextResponse.json(
        {
          error: rateLimitCheck.message,
          resetIn: rateLimitCheck.resetIn,
        },
        { status: 429 },
      )
    }

    const membershipDoc = await db.collection("memberships").doc(userId).get()
    const membershipData = membershipDoc.data()
    console.log("[v0] Membership data fetched:", {
      exists: membershipDoc.exists,
      plan: membershipData?.plan,
      membershipTier: membershipData?.membershipTier,
    })

    if (!membershipData) {
      console.log("[v0] Membership not found - returning 404")
      return NextResponse.json({ error: "Membership not found" }, { status: 404 })
    }

    const testModeActive = isTestMode() && isTestDomain(domain)
    console.log("[v0] Test mode check:", {
      testModeActive,
      isTestMode: isTestMode(),
      isTestDomain: isTestDomain(domain),
    })

    if (!testModeActive) {
      const membershipTier = membershipData.plan || membershipData.membershipTier || "free"
      const allowedPlans = ["facelessprenuer"]
      console.log("[v0] Membership check:", {
        membershipTier,
        plan: membershipData.plan,
        membershipTierField: membershipData.membershipTier,
        allowedPlans,
        isAllowed: allowedPlans.includes(membershipTier),
      })

      if (!allowedPlans.includes(membershipTier)) {
        console.log("[v0] Membership check FAILED - returning 403")
        return NextResponse.json({ error: "Custom domains require Facelessprenuer membership" }, { status: 403 })
      }
      console.log("[v0] Membership check PASSED")
    }

    if (testModeActive) {
      console.log(`[v0] TEST MODE - Adding test domain: ${domain}`)
    } else {
      console.log("[v0] Validating domain format...")

      // Existing validation
      const securityCheck = await checkDomainSecurity(userId, domain)
      console.log("[v0] Security check:", securityCheck)
      if (!securityCheck.safe) {
        console.log("[v0] Security check FAILED - returning 403")
        return NextResponse.json({ error: securityCheck.reason }, { status: 403 })
      }

      // Validate domain format - more permissive regex that allows valid subdomains
      const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
      const isValidFormat = domainRegex.test(domain)
      console.log("[v0] Domain format validation:", {
        domain,
        isValid: isValidFormat,
        regex: domainRegex.toString(),
      })
      if (!isValidFormat) {
        console.log("[v0] Invalid domain format - returning 400")
        return NextResponse.json({ error: "Invalid domain format" }, { status: 400 })
      }

      // Prevent using massclip.com subdomains
      if (domain.includes("massclip.com") || domain.includes("massclip.pro")) {
        console.log("[v0] MassClip domain blocked - returning 400")
        return NextResponse.json({ error: "Cannot use MassClip domains" }, { status: 400 })
      }
    }

    // Check if domain already exists (active domains)
    const existingDomainQuery = await db.collection("customDomains").where("domain", "==", domain.toLowerCase()).get()

    // Filter out removed domains in memory to avoid complex composite index
    const activeDomains = existingDomainQuery.docs.filter((doc) => doc.data().status !== "removed")
    console.log("[v0] Existing domain check:", { found: activeDomains.length })

    if (activeDomains.length > 0) {
      console.log("[v0] Domain already in use - returning 409")
      return NextResponse.json({ error: "Domain already in use" }, { status: 409 })
    }

    const userDomainQuery = await db.collection("customDomains").where("userId", "==", userId).get()

    // Filter out removed domains in memory
    const activeUserDomains = userDomainQuery.docs.filter((doc) => doc.data().status !== "removed")
    console.log("[v0] User domain check:", { found: activeUserDomains.length })

    if (activeUserDomains.length > 0) {
      console.log("[v0] User already has domain - returning 409")
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
    console.error("[v0] Custom Domain Add Error:", error)
    return NextResponse.json({ error: error.message || "Failed to add custom domain" }, { status: 500 })
  }
}
