import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const cookieStore = cookies()

    // Clear all auth-related cookies
    const authCookies = [
      "session",
      "firebase-auth-token",
      "__session",
      "next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
    ]

    authCookies.forEach((cookieName) => {
      cookieStore.delete(cookieName)
    })

    return NextResponse.json({
      success: true,
      message: "Successfully logged out",
    })
  } catch (error) {
    console.error("Error clearing session:", error)
    return NextResponse.json(
      {
        error: "Failed to clear session",
        success: false,
      },
      { status: 500 },
    )
  }
}
