import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function getAuthToken(request: NextRequest): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  return authorization.split("Bearer ")[1]
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken(request)

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : null

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        status: "not_connected",
        message: "No Stripe account connected",
      })
    }

    return NextResponse.json({
      status: "connected",
      stripeAccountId: userData.stripeAccountId,
    })
  } catch (error) {
    console.error("Error checking status:", error)
    return NextResponse.json(
      {
        error: "Failed to check status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
