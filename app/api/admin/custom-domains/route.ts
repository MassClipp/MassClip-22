import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    initializeFirebaseAdmin()

    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`[v0] [Admin Custom Domains] Fetching all domains for admin user: ${userId}`)

    // Get all custom domains
    const domainsSnapshot = await db.collection("customDomains").orderBy("createdAt", "desc").get()

    const domains = []
    const userCache = new Map<string, any>()

    // Fetch user details for each domain
    for (const doc of domainsSnapshot.docs) {
      const domainData = doc.data()

      // Get user details (with caching)
      let userData = userCache.get(domainData.userId)
      if (!userData) {
        const userDoc = await db.collection("users").doc(domainData.userId).get()
        userData = userDoc.data()
        if (userData) {
          userCache.set(domainData.userId, userData)
        }
      }

      domains.push({
        id: doc.id,
        ...domainData,
        userEmail: userData?.email,
        username: userData?.username,
      })
    }

    // Calculate stats
    const stats = {
      totalDomains: domains.length,
      verifiedDomains: domains.filter((d) => d.verified).length,
      pendingDomains: domains.filter((d) => !d.verified && d.status === "pending").length,
      failedDomains: domains.filter((d) => d.status === "failed" || d.healthStatus === "down").length,
      sslActive: domains.filter((d) => d.sslStatus === "active").length,
      sslPending: domains.filter((d) => d.sslStatus === "pending").length,
      sslError: domains.filter((d) => d.sslStatus === "error").length,
      healthyDomains: domains.filter((d) => d.isHealthy).length,
      unhealthyDomains: domains.filter((d) => d.isHealthy === false).length,
    }

    console.log(`[v0] [Admin Custom Domains] Returning ${domains.length} domains with stats`)

    return NextResponse.json({
      success: true,
      domains,
      stats,
    })
  } catch (error: any) {
    console.error("[Admin Custom Domains] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch domains" }, { status: 500 })
  }
}
