"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react"

export default function StripeOAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processing your Stripe connection...")
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      setStatus("error")
      setMessage(errorDescription || "An error occurred during the OAuth process")
      return
    }

    if (!code || !state) {
      setStatus("error")
      setMessage("Missing required parameters")
      return
    }

    // The actual processing happens in the API route
    // This page is just a visual indicator for the user
    // The API route will redirect back to the temp-stripe-connect page

    // Simulate processing time
    const timer = setTimeout(() => {
      router.push("/temp-stripe-connect?success=true")
    }, 3000)

    return () => clearTimeout(timer)
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === "loading" && "Connecting Stripe Account..."}
            {status === "success" && "Connection Successful!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "success" && (
            <Alert className="border-green-600 bg-green-600/10">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Success!</strong> Your Stripe account has been connected.
                {accountId && <div className="mt-2 font-mono text-xs">{accountId}</div>}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert className="border-red-600 bg-red-600/10">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push("/temp-stripe-connect")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Connect Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
