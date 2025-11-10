import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")

  if (!domain) {
    return NextResponse.json({ error: "Domain parameter required" }, { status: 400 })
  }

  try {
    initializeFirebaseAdmin()

    console.log(`[v0] [Debug] Looking up domain: ${domain}`)

    // Find the domain document
    const domainQuery = await db.collection("customDomains").where("domain", "==", domain.toLowerCase()).limit(1).get()

    if (domainQuery.empty) {
      return NextResponse.json({
        found: false,
        domain,
        message: "Domain not found in customDomains collection",
      })
    }

    const domainDoc = domainQuery.docs[0]
    const domainData = domainDoc.data()

    console.log(`[v0] [Debug] Found domain doc:`, domainData)

    // Get the user data
    const userDoc = await db.collection("users").doc(domainData.userId).get()
    const userData = userDoc.exists ? userDoc.data() : null

    return NextResponse.json({
      found: true,
      domain: domain,
      domainData: {
        id: domainDoc.id,
        userId: domainData.userId,
        domain: domainData.domain,
        status: domainData.status,
        verified: domainData.verified,
        sslStatus: domainData.sslStatus,
        vercelDomainAdded: domainData.vercelDomainAdded,
        createdAt: domainData.createdAt,
      },
      userData: userData
        ? {
            username: userData.username,
            displayName: userData.displayName,
            email: userData.email,
          }
        : null,
      expectedRewritePath: userData?.username ? `/creator/${userData.username}` : null,
    })
  } catch (error: any) {
    console.error("[v0] [Debug] Error:", error)
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
