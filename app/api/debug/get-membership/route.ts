import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { getMembership } from "@/lib/memberships-service"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const membership = await getMembership(userId)

    if (!membership) {
      return NextResponse.json({ error: "No membership found" }, { status: 404 })
    }

    return NextResponse.json(membership)
  } catch (error) {
    console.error("Error getting membership:", error)
    return NextResponse.json({ error: "Failed to get membership" }, { status: 500 })
  }
}
