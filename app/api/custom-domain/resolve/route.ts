import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

// This runs in Node.js runtime so Firebase Admin works properly

export async function GET(request: NextRequest) {
  const customDomain = request.nextUrl.searchParams.get("customDomain")
  const originalPath = request.nextUrl.searchParams.get("originalPath") || "/"

  if (!customDomain) {
    return NextResponse.json({ error: "No domain provided" }, { status: 400 })
  }

  try {
    // Query Firestore for the custom domain
    const snapshot = await db
      .collection("customDomains")
      .where("domain", "==", customDomain)
      .where("verified", "==", true)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    // Get the user's username
    const userDoc = await db.collection("users").doc(data.userId).get()

    if (userDoc.exists) {
      const userData = userDoc.data()
      const username = userData?.username

      if (username) {
        const rewritePath = `/creator/${username}${originalPath === "/" ? "" : originalPath}`
        return NextResponse.json({ rewriteTo: rewritePath })
      }
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 })
  } catch (error) {
    console.error("[Custom Domain Resolve] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
