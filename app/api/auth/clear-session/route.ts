import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear the session cookie
    cookies().set({
      name: "session",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0, // Expire immediately
      path: "/",
      sameSite: "lax",
    })

    console.log("✅ Session cookie cleared")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Error clearing session:", error)
    return NextResponse.json({ error: "Failed to clear session" }, { status: 500 })
  }
}
