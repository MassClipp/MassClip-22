"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Loader2, AlertCircle, ExternalLink, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PurchaseDetails {
  sessionId: string
  productBoxId: string
  userId?: string
  amount: number
  currency: string
  connectedAccountId?: string
  mode: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (sessionId) {
      verifyPurchase()
    } else {
      setError("No session ID provided")
      setLoading(false)
    }
  }, [sessionId, user])

  const verifyPurchase = async () => {
    if (!sessionId) return

    setLoading(true)
    try {
      console.log("🔍 Verifying purchase for session:", sessionId)

      const requestBody: any = { sessionId }

      // Include ID token if user is authenticated
      if (user) {
        try {
          const idToken = await user.getIdToken()
          requestBody.idToken = idToken
          console.log("✅ Added user token to verification request")
        } catch (tokenError) {
          console.warn("⚠️ Failed to get user token, proceeding without:", tokenError)
        }
      }

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        setPurchase(data.purchase)
        console.log("✅ Purchase verified:", data.purchase)
        toast({
          title: "Purchase Successful!",
          description: "Your payment has been processed and access has been granted.",
        })
      } else {
        setError(data.error || "Failed to verify purchase")
        console.error("❌ Purchase verification failed:", data)
      }
    } catch (error: any) {
      console.error("❌ Error verifying purchase:", error)
      setError("Failed to verify purchase")
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

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Verifying your purchase...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="bg-zinc-900/60 border-red-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Purchase Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-600 bg-red-600/10 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            {sessionId && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-zinc-400">Session ID</div>
                  <div className="font-mono text-sm flex items-center gap-2">
                    {sessionId}
                    <Button variant="ghost" size="sm" onClick={copySessionId}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={verifyPurchase} variant="outline">
                    Retry Verification
                  </Button>
                  <Button onClick={() => (window.location.href = "/dashboard")} variant="outline">
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>No Purchase Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400">Unable to find purchase details.</p>
            <Button onClick={() => (window.location.href = "/dashboard")} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Success Header */}
      <Card className="bg-zinc-900/60 border-green-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-6 w-6" />
            Purchase Successful!
          </CardTitle>
          <CardDescription>Your payment has been processed and access has been granted.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-600 bg-green-600/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Complete:</strong> You now have access to your purchased content. Check your dashboard to
              view your new content.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Purchase Details */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-lg">Purchase Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-zinc-400">Amount Paid</div>
              <div className="text-xl font-semibold">{formatAmount(purchase.amount, purchase.currency)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400">Payment Mode</div>
              <div className="text-sm">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    purchase.mode === "test" ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-400"
                  }`}
                >
                  {purchase.mode === "test" ? "Test Mode" : "Live Mode"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-400">Session ID</div>
                <div className="font-mono text-sm">{purchase.sessionId}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={copySessionId}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {purchase.connectedAccountId && (
              <div>
                <div className="text-sm text-zinc-400">Connected Account</div>
                <div className="font-mono text-sm">{purchase.connectedAccountId}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-zinc-400">Product Box ID</div>
              <div className="font-mono text-sm">{purchase.productBoxId}</div>
            </div>

            {purchase.userId && (
              <div>
                <div className="text-sm text-zinc-400">User ID</div>
                <div className="font-mono text-sm">{purchase.userId}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Your purchase has been completed successfully. Here's what you can do:
            </p>
            <ul className="text-sm text-zinc-400 space-y-1 ml-4">
              <li>• Access your purchased content from your dashboard</li>
              <li>• Download any available files</li>
              <li>• View your purchase history</li>
              <li>• Contact support if you have any issues</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => (window.location.href = "/dashboard/purchases")} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              View My Purchases
            </Button>
            <Button
              onClick={() => (window.location.href = `/product-box/${purchase.productBoxId}/content`)}
              variant="outline"
              className="flex-1"
            >
              Access Content
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Mode Notice */}
      {purchase.mode === "test" && (
        <Alert className="border-blue-600 bg-blue-600/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Mode:</strong> This was a test transaction. No real money was charged. In live mode, this would
            be a real payment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
