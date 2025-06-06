import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Clear the session cookie
    cookies().set({
      name: "session",
      value: "",
      expires: new Date(0),
      path: "/",
    })

    console.log("Session cookie cleared successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear session" },
      { status: 500 },
    )
  }
}
