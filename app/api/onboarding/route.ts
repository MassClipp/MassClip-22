import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { getOnboardingProgress } from "@/lib/onboarding-service"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const progress = await getOnboardingProgress(userId)

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("[v0] Error getting onboarding progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
