"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Copy, Package, CreditCard } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PurchaseDetails {
  success: boolean
  purchaseId?: string
  productBoxId?: string
  creatorId?: string
  buyerId?: string
  amount?: number
  environment?: string
  connectedAccountId?: string
  alreadyProcessed?: boolean
  error?: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (sessionId) {
      verifyPurchase()
    } else {
      setLoading(false)
      setPurchaseDetails({ success: false, error: "No session ID provided" })
    }
  }, [sessionId, user])

  const verifyPurchase = async () => {
    if (!sessionId) return

    setLoading(true)
    try {
      console.log("🔍 Verifying purchase for session:", sessionId)

      let idToken = null
      if (user) {
        idToken = await user.getIdToken()
      }

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
      console.log("📊 Purchase verification response:", data)

      setDebugInfo(data)
      setPurchaseDetails(data)

      if (data.success) {
        toast({
          title: "Purchase Verified!",
          description: data.alreadyProcessed
            ? "Your purchase was already processed"
            : "Your purchase has been successfully verified and access granted",
        })
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Failed to verify your purchase",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Error verifying purchase:", error)
      setPurchaseDetails({ success: false, error: error.message })
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast({
        title: "Copied",
        description: "Session ID copied to clipboard",
      })
    }
  }

  const copyDebugInfo = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    toast({
      title: "Copied",
      description: "Debug info copied to clipboard",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Verifying your purchase...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Purchase Complete</h1>
        <p className="text-zinc-400">Thank you for your purchase!</p>
      </div>

      {/* Purchase Status */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {purchaseDetails?.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            Purchase Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {purchaseDetails?.success ? (
            <div className="space-y-4">
              <Alert className="border-green-600 bg-green-600/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success!</strong> Your purchase has been verified and access has been granted.
                  {purchaseDetails.alreadyProcessed && " (This purchase was already processed)"}
                </AlertDescription>
              </Alert>

              {/* Purchase Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchaseDetails.amount && (
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <div className="text-xs text-zinc-400">Amount Paid</div>
                    <div className="text-lg font-semibold">${purchaseDetails.amount.toFixed(2)}</div>
                  </div>
                )}

                {purchaseDetails.environment && (
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <div className="text-xs text-zinc-400">Environment</div>
                    <div className="text-sm">
                      <Badge variant={purchaseDetails.environment === "test" ? "secondary" : "default"}>
                        {purchaseDetails.environment === "test" ? "Test Mode" : "Live Mode"}
                      </Badge>
                    </div>
                  </div>
                )}

                {purchaseDetails.purchaseId && (
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <div className="text-xs text-zinc-400">Purchase ID</div>
                    <div className="font-mono text-sm">{purchaseDetails.purchaseId}</div>
                  </div>
                )}

                {purchaseDetails.connectedAccountId && (
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <div className="text-xs text-zinc-400">Connected Account</div>
                    <div className="font-mono text-sm">{purchaseDetails.connectedAccountId}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {purchaseDetails.productBoxId && (
                  <Button
                    onClick={() => (window.location.href = `/product-box/${purchaseDetails.productBoxId}/content`)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Access Content
                  </Button>
                )}
                <Button variant="outline" onClick={() => (window.location.href = "/dashboard/purchases")}>
                  View All Purchases
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-red-600 bg-red-600/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Verification Failed:</strong> {purchaseDetails?.error || "Unknown error occurred"}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={verifyPurchase} variant="outline">
                  Retry Verification
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details */}
      {sessionId && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-400">Checkout Session ID</div>
                <div className="font-mono text-sm">{sessionId}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={copySessionId}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {debugInfo && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Debug Information
              <Button variant="ghost" size="sm" onClick={copyDebugInfo}>
                <Copy className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-zinc-800 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="text-center">
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  )
}
