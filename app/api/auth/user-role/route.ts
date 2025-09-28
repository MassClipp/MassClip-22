import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-middleware"
import { getAdminDb } from "@/lib/firebase-admin"

export const GET = withAuth(async (req) => {
  try {
    const db = getAdminDb()
    const userDoc = await db.collection("users").doc(req.user!.uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({ role: "user" })
    }

    const userData = userDoc.data()
    return NextResponse.json({
      role: userData?.role || "user",
      plan: userData?.plan || "free",
      permissions: userData?.permissions || [],
    })
  } catch (error) {
    console.error("Error fetching user role:", error)
    return NextResponse.json({ error: "Failed to fetch user role" }, { status: 500 })
  }
})
