import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { SetupProfileForm } from "@/components/setup-profile-form"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

// Server component to check if user has already set up profile
export default async function SetupProfilePage() {
  // Get the session cookie
  const sessionCookie = cookies().get("session")?.value

  if (!sessionCookie) {
    // No session, redirect to login
    redirect("/login?redirect=/setup-profile")
  }

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Verify the session cookie
    const decodedClaims = await (await import("firebase-admin/auth")).getAuth().verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Check if user has already set up profile
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    if (userData?.hasSetupProfile) {
      // User has already set up profile, redirect to dashboard
      redirect("/dashboard")
    }

    // User needs to set up profile
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <SetupProfileForm />
      </div>
    )
  } catch (error) {
    console.error("Error in setup profile page:", error)
    // Session invalid or error, redirect to login
    redirect("/login?redirect=/setup-profile")
  }
}
