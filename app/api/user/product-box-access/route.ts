import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

async function getUserIdFromHeader(): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.split("Bearer ")[1]
  try {
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error("❌ [Product Box Access] Auth error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [Product Box Access] Checking access for user: ${userId}`)

    // Fetch product boxes the user has access to (replace with your actual logic)
    const productBoxes = [] // Replace with actual data fetching

    return NextResponse.json({
      success: true,
      productBoxes,
      count: productBoxes.length,
    })
  } catch (error) {
    console.error("❌ [Product Box Access] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch product box access",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
