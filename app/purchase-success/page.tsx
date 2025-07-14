"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2, ExternalLink, Copy, CreditCard, Package, User, DollarSign } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PurchaseDetails {
  session: {
    id: string
    amount: number
    currency: string
    status: string
  }
  purchase: {
    productBoxId: string
    userId: string
    connectedAccountId?: string
  }
}

export default function PurchaseSuccessPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [loading, setLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [error, setError] = useState("")

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
      const token = user ? await user.getIdToken(true) : null

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          idToken: token,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPurchaseDetails(data)
        toast({
          title: "Purchase Verified!",
          description: "Your purchase has been successfully processed and access granted.",
        })
      } else {
        setError(data.error || "Failed to verify purchase")
      }
    } catch (error: any) {
      console.error("Purchase verification error:", error)
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
              <XCircle className="h-5 w-5" />
              Purchase Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-600 bg-red-600/10">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>

            {sessionId && (
              <div className="mt-4 p-3 bg-zinc-800/50 rounded">
                <div className="text-xs text-zinc-400">Session ID</div>
                <div className="font-mono text-sm flex items-center justify-between">
                  {sessionId}
                  <Button variant="ghost" size="sm" onClick={copySessionId}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button onClick={() => (window.location.href = "/dashboard")} variant="outline">
                Go to Dashboard
              </Button>
              <Button onClick={verifyPurchase}>Retry Verification</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchaseDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>No Purchase Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400">Unable to load purchase details.</p>
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
          <CardDescription>
            Your payment has been processed and access has been granted to your content.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Purchase Details */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-zinc-400">Amount Paid</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {formatAmount(purchaseDetails.session.amount, purchaseDetails.session.currency)}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400">Payment Status</div>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  {purchaseDetails.session.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-zinc-400">Product Box ID</div>
                <div className="font-mono text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {purchaseDetails.purchase.productBoxId}
                </div>
              </div>

              {purchaseDetails.purchase.userId && (
                <div>
                  <div className="text-xs text-zinc-400">User ID</div>
                  <div className="font-mono text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {purchaseDetails.purchase.userId.substring(0, 12)}...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected Account Info */}
          {purchaseDetails.purchase.connectedAccountId && (
            <div className="border-t border-zinc-800 pt-4">
              <div className="text-xs text-zinc-400 mb-2">Connected Account</div>
              <div className="font-mono text-sm bg-zinc-800/50 p-2 rounded flex items-center justify-between">
                {purchaseDetails.purchase.connectedAccountId}
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  Test Mode
                </Badge>
              </div>
            </div>
          )}

          {/* Session ID */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="text-xs text-zinc-400 mb-2">Session ID</div>
            <div className="font-mono text-sm bg-zinc-800/50 p-2 rounded flex items-center justify-between">
              {purchaseDetails.session.id}
              <Button variant="ghost" size="sm" onClick={copySessionId}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-zinc-400">
            You now have access to the purchased content. You can view it in your dashboard or access it directly.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={() => (window.location.href = `/product-box/${purchaseDetails.purchase.productBoxId}/content`)}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Content
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard/purchases")} variant="outline">
              View Purchases
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
