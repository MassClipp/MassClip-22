"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export default function StripeCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useFirebaseAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const error = searchParams.get("error")

      if (error) {
        setStatus("error")
        setMessage(`Stripe connection was cancelled or failed: ${error}`)
        return
      }

      if (!code || !state) {
        setStatus("error")
        setMessage("Missing required parameters from Stripe")
        return
      }

      if (!user) {
        setStatus("error")
        setMessage("User not authenticated")
        return
      }

      try {
        // Get the user's ID token
        const idToken = await user.getIdToken()

        // Send the code and state to our backend
        const response = await fetch("/api/stripe/connect/oauth-callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            state,
            idToken,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus("success")
          setMessage("Successfully connected your Stripe account!")

          // Redirect to earnings page after a short delay
          setTimeout(() => {
            router.push("/dashboard/earnings")
          }, 2000)
        } else {
          setStatus("error")
          setMessage(data.error || "Failed to process OAuth callback")
        }
      } catch (error) {
        console.error("Error processing callback:", error)
        setStatus("error")
        setMessage("Failed to process OAuth callback")
      }
    }

    if (user) {
      processCallback()
    }
  }, [searchParams, user, router])

  const handleTryAgain = () => {
    router.push("/dashboard/connect-stripe")
  }

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle>
            {status === "loading" && "Processing Connection..."}
            {status === "success" && "Connection Successful!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we connect your Stripe account"}
            {status === "success" && "Your Stripe account has been successfully connected"}
            {status === "error" && "There was an issue connecting your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                status === "error"
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              }`}
            >
              {message}
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <Button onClick={handleTryAgain} className="w-full" variant="destructive">
                Try Again
              </Button>
              <Button onClick={handleReturnToDashboard} className="w-full bg-transparent" variant="outline">
                Return to Dashboard
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">Redirecting to earnings page...</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
