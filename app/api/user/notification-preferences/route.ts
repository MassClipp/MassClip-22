import { type NextRequest, NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 })
    }

    // Get notification preferences
    const preferencesDoc = await adminDb.collection("notificationPreferences").doc(userEmail).get()

    const defaultPreferences = {
      purchaseNotifications: true,
      downloadNotifications: true,
      emailNotifications: true,
    }

    const preferences = preferencesDoc.exists() ? preferencesDoc.data() : defaultPreferences

    return NextResponse.json({
      success: true,
      preferences: {
        purchaseNotifications: preferences.purchaseNotifications ?? true,
        downloadNotifications: preferences.downloadNotifications ?? true,
        emailNotifications: preferences.emailNotifications ?? true,
      },
    })
  } catch (error: any) {
    console.error("Error fetching notification preferences:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 })
    }

    const { preferences } = await request.json()

    if (!preferences) {
      return NextResponse.json({ error: "Preferences data required" }, { status: 400 })
    }

    // Save notification preferences
    await adminDb
      .collection("notificationPreferences")
      .doc(userEmail)
      .set(
        {
          email: userEmail,
          userId,
          purchaseNotifications: preferences.purchaseNotifications ?? true,
          downloadNotifications: preferences.downloadNotifications ?? true,
          emailNotifications: preferences.emailNotifications ?? true,
          updatedAt: new Date(),
        },
        { merge: true },
      )

    return NextResponse.json({
      success: true,
      message: "Notification preferences saved successfully",
    })
  } catch (error: any) {
    console.error("Error saving notification preferences:", error)
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })
  }
}
