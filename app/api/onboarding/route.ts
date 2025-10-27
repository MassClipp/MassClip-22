import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getOnboardingProgress, initializeOnboarding } from "@/lib/onboarding-service"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    let progress = await getOnboardingProgress(userId)

    // Initialize onboarding if it doesn't exist
    if (!progress) {
      progress = await initializeOnboarding(userId)
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching onboarding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
