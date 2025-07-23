"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StripeCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const error = searchParams.get("error")

      // Handle Stripe errors
      if (error) {
        setStatus("error")
        setMessage("Connection was cancelled or failed. Please try again.")
        return
      }

      // Check for required parameters
      if (!code || !state) {
        setStatus("error")
        setMessage("Missing required parameters. Please try connecting again.")
        return
      }

      try {
        // Call our backend API to process the OAuth callback
        const response = await fetch("/api/stripe/connect/oauth-callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, state }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus("success")
          setMessage("Your Stripe account has been successfully connected!")

          // Redirect to main connect page with success parameter after 2 seconds
          setTimeout(() => {
            router.push("/dashboard/connect-stripe?success=true")
          }, 2000)
        } else {
          setStatus("error")
          setMessage(data.error || "Failed to connect your Stripe account. Please try again.")
        }
      } catch (error) {
        console.error("Error processing callback:", error)
        setStatus("error")
        setMessage("An unexpected error occurred. Please try again.")
      }
    }

    processCallback()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push("/dashboard/connect-stripe")
  }

  const handleContinue = () => {
    router.push("/dashboard/connect-stripe?success=true")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === "processing" && <Loader2 className="h-12 w-12 animate-spin text-blue-600" />}
              {status === "success" && <CheckCircle className="h-12 w-12 text-green-600" />}
              {status === "error" && <AlertCircle className="h-12 w-12 text-red-600" />}
            </div>
            <CardTitle className="text-xl">
              {status === "processing" && "Processing Connection..."}
              {status === "success" && "Connection Successful!"}
              {status === "error" && "Connection Failed"}
            </CardTitle>
            <CardDescription>
              {status === "processing" && "Please wait while we connect your Stripe account"}
              {status === "success" && "Your Stripe account is now connected"}
              {status === "error" && "There was an issue connecting your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert variant={status === "error" ? "destructive" : "default"}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {status === "processing" && (
              <div className="text-center text-sm text-muted-foreground">
                <p>This may take a few moments...</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  <p>Redirecting you to the dashboard...</p>
                </div>
                <Button onClick={handleContinue} className="w-full">
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
                  Return to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
