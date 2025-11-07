import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { checkSubscription } from "@/lib/subscription"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const subscription = await checkSubscription(userId)

    return NextResponse.json(subscription)
  } catch (error) {
    console.error("Error checking subscription:", error)
    return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 })
  }
}
