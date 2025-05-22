import { NextResponse } from "next/server"
import { validateSessionCookie } from "@/lib/server-session"

export async function GET() {
  try {
    const decodedToken = await validateSessionCookie()

    if (!decodedToken) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      uid: decodedToken.uid,
      expiresAt: decodedToken.exp * 1000, // Convert to milliseconds
    })
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json({ valid: false, error: "Session validation failed" }, { status: 500 })
  }
}
