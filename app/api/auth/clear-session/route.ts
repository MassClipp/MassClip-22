import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

export async function POST() {
  try {
    const cookieStore = cookies()
    cookieStore.delete("session")

    console.log("✅ Session cookie cleared successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Error clearing session:", error)
    return NextResponse.json({ error: "Failed to clear session" }, { status: 500 })
  }
}
