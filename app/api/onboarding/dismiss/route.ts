import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { dismissOnboarding } from "@/lib/onboarding-service"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    await dismissOnboarding(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error dismissing onboarding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
