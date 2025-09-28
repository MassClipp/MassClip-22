import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-middleware"
import { getAdminDb, FieldValue } from "@/lib/firebase-admin"

export const GET = withAuth(async (req) => {
  try {
    const db = getAdminDb()
    const userDoc = await db.collection("users").doc(req.user!.uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const profile = userDoc.data()

    return NextResponse.json({
      profile: {
        ...profile,
        // Convert Firestore timestamps to ISO strings
        createdAt: profile?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: profile?.updatedAt?.toDate?.()?.toISOString() || null,
        lastLoginAt: profile?.lastLoginAt?.toDate?.()?.toISOString() || null,
        subscription: {
          ...profile?.subscription,
          currentPeriodStart: profile?.subscription?.currentPeriodStart?.toDate?.()?.toISOString() || null,
          currentPeriodEnd: profile?.subscription?.currentPeriodEnd?.toDate?.()?.toISOString() || null,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
})

export const PATCH = withAuth(async (req) => {
  try {
    const body = await req.json()
    const db = getAdminDb()

    // Remove sensitive fields that shouldn't be updated directly
    const { uid, createdAt, subscription, usage, ...updates } = body

    // Add timestamp
    updates.updatedAt = FieldValue.serverTimestamp()

    await db.collection("users").doc(req.user!.uid).update(updates)

    // Fetch updated profile
    const updatedDoc = await db.collection("users").doc(req.user!.uid).get()
    const profile = updatedDoc.data()

    return NextResponse.json({
      profile: {
        ...profile,
        createdAt: profile?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: profile?.updatedAt?.toDate?.()?.toISOString() || null,
        lastLoginAt: profile?.lastLoginAt?.toDate?.()?.toISOString() || null,
        subscription: {
          ...profile?.subscription,
          currentPeriodStart: profile?.subscription?.currentPeriodStart?.toDate?.()?.toISOString() || null,
          currentPeriodEnd: profile?.subscription?.currentPeriodEnd?.toDate?.()?.toISOString() || null,
        },
      },
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
})
