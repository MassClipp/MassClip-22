import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { completeTask } from "@/lib/onboarding-service"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { taskId } = await request.json()

    await completeTask(userId, taskId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error completing task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
