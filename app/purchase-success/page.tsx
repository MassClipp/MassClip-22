"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PurchaseSuccessPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const verifyPurchase = async (sessionId: string) => {
    if (!user) {
      setVerificationStatus("error")
      setErrorMessage("Please log in to verify your purchase")
      return
    }

    try {
      console.log("🔍 [Purchase Success] Starting verification for session:", sessionId)

      const idToken = await user.getIdToken()

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          idToken,
        }),
      })

      const data = await response.json()
      console.log("📊 [Purchase Success] Verification response:", data)

      if (data.success) {
        setVerificationStatus("success")
        toast({
          title: "Purchase Verified!",
          description: "Your access has been granted successfully.",
        })
      } else {
        setVerificationStatus("error")
        setErrorMessage(data.error || data.message || "Verification failed")
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setVerificationStatus("error")
      setErrorMessage("Failed to verify purchase. Please try again.")
    }
  }

  const handleRetry = async () => {
    if (!sessionId) return

    setIsRetrying(true)
    setVerificationStatus("loading")
    await verifyPurchase(sessionId)
    setIsRetrying(false)
  }

  useEffect(() => {
    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")

    console.log("🔗 [Purchase Success] Session ID from URL:", sessionIdFromUrl)

    if (!sessionIdFromUrl) {
      setVerificationStatus("error")
      setErrorMessage("No session ID found in URL")
      return
    }

    setSessionId(sessionIdFromUrl)

    // Wait for user to be loaded before verifying
    if (user) {
      verifyPurchase(sessionIdFromUrl)
    }
  }, [user])

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Invalid Purchase Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">This purchase verification link is invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {verificationStatus === "loading" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Verifying Purchase
              </>
            )}
            {verificationStatus === "success" && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Purchase Verified!
              </>
            )}
            {verificationStatus === "error" && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Verification Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {verificationStatus === "loading" && "Please wait while we verify your payment..."}
            {verificationStatus === "success" && "Your purchase has been confirmed and access granted."}
            {verificationStatus === "error" && "There was an issue verifying your purchase."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus === "loading" && (
            <div className="text-center">
              <div className="animate-pulse text-gray-600">Processing your payment verification...</div>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium">🎉 Success! You now have access to your purchased content.</p>
              <Button onClick={() => (window.location.href = "/dashboard/purchases")} className="w-full">
                View My Purchases
              </Button>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="space-y-4">
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded">{errorMessage}</p>
              <Button onClick={handleRetry} disabled={isRetrying} className="w-full bg-transparent" variant="outline">
                {isRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Verification
                  </>
                )}
              </Button>
              <div className="text-xs text-gray-500 text-center">Session ID: {sessionId}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
