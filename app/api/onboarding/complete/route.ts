import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { completeOnboardingTask } from "@/lib/onboarding-service"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { taskId } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const progress = await completeOnboardingTask(userId, taskId)

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error completing onboarding task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
