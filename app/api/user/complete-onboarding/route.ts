import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { verifyIdToken } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Mark onboarding as complete
    const userRef = doc(db, "users", userId)
    await setDoc(
      userRef,
      {
        onboardingComplete: true,
        onboardingCompletedAt: new Date(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Complete Onboarding] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
