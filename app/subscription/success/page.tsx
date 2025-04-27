"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying your subscription...")

  useEffect(() => {
    async function verifySubscription() {
      try {
        // Get the session ID from the URL
        const sessionId = searchParams.get("session_id")

        if (!sessionId) {
          setStatus("error")
          setMessage("Missing session information. Please contact support.")
          return
        }

        if (!user) {
          setStatus("error")
          setMessage("User not authenticated. Please log in and try again.")
          return
        }

        console.log(`Verifying subscription for user ${user.uid} with session ${sessionId}`)

        // Update the user document to indicate we've seen this success page
        await updateDoc(doc(db, "users", user.uid), {
          lastCheckoutSessionId: sessionId,
          checkoutCompleted: true,
          checkoutCompletedAt: new Date().toISOString(),
        })

        // The actual subscription update will be handled by the webhook
        setStatus("success")
        setMessage("Your subscription was successful! You now have access to Pro features.")

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)
      } catch (error) {
        console.error("Error verifying subscription:", error)
        setStatus("error")
        setMessage("There was an error verifying your subscription. Please contact support.")
      }
    }

    verifySubscription()
  }, [searchParams, user, router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-gray-900 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {status === "loading" && "Processing..."}
          {status === "success" && "Thank You!"}
          {status === "error" && "Oops!"}
        </h1>

        <div className="text-center mb-6">
          {status === "loading" && (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-crimson mx-auto"></div>
          )}
          {status === "success" && <div className="text-green-500 text-5xl mb-4">✓</div>}
          {status === "error" && <div className="text-red-500 text-5xl mb-4">✗</div>}
        </div>

        <p className="text-center mb-6">{message}</p>

        {status === "success" && (
          <p className="text-center text-sm text-gray-400">Redirecting you to the dashboard in a few seconds...</p>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2 bg-crimson text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}
