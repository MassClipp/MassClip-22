"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processing your subscription...")

  useEffect(() => {
    async function processSubscription() {
      try {
        // Get the session ID and user ID from the URL
        const sessionId = searchParams.get("session_id")
        const userId = searchParams.get("userId") || user?.uid

        if (!sessionId) {
          setStatus("error")
          setMessage("Missing session information. Please contact support.")
          return
        }

        if (!userId) {
          setStatus("error")
          setMessage("User not authenticated. Please log in and try again.")
          return
        }

        console.log(`Processing subscription for user ${userId} with session ${sessionId}`)

        // Call our manual upgrade endpoint
        const response = await fetch("/api/manual-upgrade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            sessionId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to process subscription")
        }

        setStatus("success")
        setMessage("Your subscription was successful! You now have access to Pro features.")

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)
      } catch (error) {
        console.error("Error processing subscription:", error)
        setStatus("error")
        setMessage("There was an error processing your subscription. Please contact support.")
      }
    }

    processSubscription()
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
