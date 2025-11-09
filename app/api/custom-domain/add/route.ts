import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { isApexDomain, getDNSInstructions } from "@/lib/dns-utils"

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

    // Check user is Facelessprenuer
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const membershipTier = userData.membershipTier || "free"
    if (membershipTier !== "facelessprenuer") {
      return NextResponse.json({ error: "Custom domains require Facelessprenuer membership" }, { status: 403 })
    }

    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
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

    // Check if domain already exists
    const existingDomainQuery = await db
      .collection("customDomains")
      .where("domain", "==", domain.toLowerCase())
      .where("status", "!=", "removed")
      .get()

    if (!existingDomainQuery.empty) {
      return NextResponse.json({ error: "Domain already in use" }, { status: 409 })
    }

    // Check if user already has a custom domain
    const userDomainQuery = await db
      .collection("customDomains")
      .where("userId", "==", userId)
      .where("status", "!=", "removed")
      .get()

    if (!userDomainQuery.empty) {
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
