import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

// In-memory cache for domain lookups
const domainCache = new Map<string, { username: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const runtime = "nodejs" // Ensure Node.js runtime for Firebase Admin

export async function GET(request: NextRequest) {
  const customDomain = request.nextUrl.searchParams.get("customDomain")
  const originalPath = request.nextUrl.searchParams.get("originalPath") || "/"

  console.log(`[v0] [Resolve API] Called with domain: ${customDomain}, path: ${originalPath}`)

  if (!customDomain) {
    console.log(`[v0] [Resolve API] No domain provided`)
    return NextResponse.json({ error: "No domain provided" }, { status: 400 })
  }

  try {
    // Check cache first
    const cached = domainCache.get(customDomain)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[v0] [Resolve API] Cache hit for ${customDomain} -> ${cached.username}`)
      const rewritePath = `/creator/${cached.username}${originalPath === "/" ? "" : originalPath}`
      return NextResponse.json({ rewriteTo: rewritePath, cached: true })
    }

    console.log(`[v0] [Resolve API] Cache miss, querying Firestore for domain: ${customDomain}`)

    // Query Firestore for the custom domain (verified OR test domains in pending state)
    const snapshot = await db
      .collection("customDomains")
      .where("domain", "==", customDomain)
      .where("status", "==", "active")
      .limit(1)
      .get()

    console.log(`[v0] [Resolve API] Firestore query returned ${snapshot.size} documents`)

    if (snapshot.empty) {
      console.log(`[v0] [Resolve API] Domain not found or not active: ${customDomain}`)
      return NextResponse.json({ error: "Domain not found or not verified" }, { status: 404 })
    }

    const doc = snapshot.docs[0]
    const data = doc.data()
    console.log(`[v0] [Resolve API] Found domain doc:`, {
      id: doc.id,
      userId: data.userId,
      domain: data.domain,
      status: data.status,
    })

    // Get the user's username
    const userDoc = await db.collection("users").doc(data.userId).get()

    if (!userDoc.exists) {
      console.log(`[v0] [Resolve API] User not found for userId: ${data.userId}`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const username = userData?.username

    if (!username) {
      console.log(`[v0] [Resolve API] Username not found for user: ${data.userId}`)
      return NextResponse.json({ error: "Username not found" }, { status: 404 })
    }

    if (userData?.storefrontActive === false) {
      console.log(`[v0] [Resolve API] Storefront is offline for user: ${data.userId}`)
      return NextResponse.json(
        {
          error: "Storefront offline",
          message: "This creator's storefront is currently offline",
        },
        { status: 503 },
      )
    }

    // Cache the successful lookup
    domainCache.set(customDomain, { username, timestamp: Date.now() })
    console.log(`[v0] [Resolve API] Successfully cached mapping: ${customDomain} -> ${username}`)

    const rewritePath = `/creator/${username}${originalPath === "/" ? "" : originalPath}`
    console.log(`[v0] [Resolve API] Returning rewrite path: ${rewritePath}`)

    return NextResponse.json({
      rewriteTo: rewritePath,
      username,
      cached: false,
    })
  } catch (error) {
    console.error("[v0] [Resolve API] Error:", error)
    return NextResponse.json(
      {
        error: "Internal error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
