import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    // Clear the session cookie
    cookies().delete("session")

    // Clear any other auth-related cookies
    cookies().delete("firebase-auth-token")
    cookies().delete("__session")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing session:", error)
    return NextResponse.json({ error: "Failed to clear session" }, { status: 500 })
  }
}
