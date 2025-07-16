"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  CreditCard,
  Package,
  User,
  DollarSign,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PurchaseDetails {
  session: {
    id: string
    amount: number
    currency: string
    status: string
    customer_email?: string
    payment_intent?: string
  }
  purchase: {
    productBoxId: string
    userId: string
    connectedAccountId?: string
    purchaseId?: string
  }
  productBox?: {
    title?: string
    description?: string
    creatorId?: string
  }
}

export default function PurchaseSuccessPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")
  const urlUserId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")

  const [loading, setLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    // Wait for auth to load
    if (user === undefined) {
      return
    }

    if (sessionId && productBoxId) {
      verifyStripeSession()
    } else if (productBoxId && (urlUserId || user)) {
      // Handle case where we have product box and user but no session ID
      handleDirectPurchaseVerification()
    } else {
      setError("Missing required purchase information in URL")
      setLoading(false)
    }
  }, [sessionId, productBoxId, urlUserId, user])

  const handleDirectPurchaseVerification = async () => {
    if (!productBoxId) return

    setLoading(true)
    setError("")

    try {
      const token = user ? await user.getIdToken(true) : null
      const userIdToUse = user?.uid || urlUserId

      if (!userIdToUse) {
        setError("No user information available")
        setLoading(false)
        return
      }

      // Try to find a recent purchase for this user and product box
      const response = await fetch("/api/purchase/verify-recent-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          userId: userIdToUse,
          creatorId,
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
        setError(data.error || "Unable to verify recent purchase")
      }
    } catch (error: any) {
      console.error("Purchase verification error:", error)
      setError("Failed to verify purchase")
    } finally {
      setLoading(false)
    }
  }

  const verifyStripeSession = async () => {
    if (!sessionId || !productBoxId) return

    setLoading(true)
    setError("")

    try {
      const token = user ? await user.getIdToken(true) : null

      // Call our API to verify the Stripe session and process the purchase
      const response = await fetch("/api/purchase/verify-and-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          productBoxId,
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
      setError("Failed to verify purchase with Stripe")
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

  // Show loading while auth is initializing
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-white/60 mb-4" />
            <p className="text-white/80 text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-white/60 mb-4" />
            <p className="text-white/80 text-center">
              {sessionId ? "Verifying your purchase with Stripe..." : "Verifying your purchase..."}
            </p>
            <p className="text-white/50 text-sm text-center mt-2">This may take a few moments</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm border-red-500/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-400">
              <XCircle className="h-6 w-6" />
              Purchase Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-white/80">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>

            {sessionId && (
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-xs text-white/60 mb-1">Session ID</div>
                <div className="font-mono text-sm text-white/80 flex items-center justify-between">
                  {sessionId}
                  <Button variant="ghost" size="sm" onClick={copySessionId} className="text-white/60 hover:text-white">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {productBoxId && (
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-xs text-white/60 mb-1">Product Box ID</div>
                <div className="font-mono text-sm text-white/80">{productBoxId}</div>
              </div>
            )}

            {(urlUserId || user?.uid) && (
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-xs text-white/60 mb-1">User ID</div>
                <div className="font-mono text-sm text-white/80">{user?.uid || urlUserId}</div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => (window.location.href = "/dashboard")}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={sessionId ? verifyStripeSession : handleDirectPurchaseVerification}
                className="flex-1 bg-white text-black hover:bg-white/90"
              >
                Retry Verification
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchaseDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white">No Purchase Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-center">Unable to load purchase details.</p>
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full mt-4 bg-white text-black hover:bg-white/90"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Success Header */}
        <Card className="bg-white/5 backdrop-blur-sm border-green-500/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-green-400 text-2xl">
              <CheckCircle className="h-8 w-8" />
              Purchase Successful!
            </CardTitle>
            <CardDescription className="text-white/70 text-lg">
              Your payment has been processed and access has been granted to your content.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Purchase Details */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5" />
              Purchase Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/50 mb-1">Amount Paid</div>
                  <div className="text-xl font-semibold flex items-center gap-2 text-white">
                    <DollarSign className="h-5 w-5" />
                    {formatAmount(purchaseDetails.session.amount, purchaseDetails.session.currency)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/50 mb-1">Payment Status</div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {purchaseDetails.session.status}
                  </Badge>
                </div>

                {purchaseDetails.session.customer_email && (
                  <div>
                    <div className="text-xs text-white/50 mb-1">Customer Email</div>
                    <div className="text-sm text-white/80">{purchaseDetails.session.customer_email}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/50 mb-1">Product</div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Package className="h-4 w-4" />
                    <span>{purchaseDetails.productBox?.title || "Product Box"}</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">ID: {purchaseDetails.purchase.productBoxId}</div>
                </div>

                {purchaseDetails.purchase.userId && (
                  <div>
                    <div className="text-xs text-white/50 mb-1">User ID</div>
                    <div className="font-mono text-sm flex items-center gap-2 text-white/80">
                      <User className="h-4 w-4" />
                      {purchaseDetails.purchase.userId.substring(0, 12)}...
                    </div>
                  </div>
                )}

                {purchaseDetails.purchase.purchaseId && (
                  <div>
                    <div className="text-xs text-white/50 mb-1">Purchase ID</div>
                    <div className="font-mono text-xs text-white/60">{purchaseDetails.purchase.purchaseId}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Session ID */}
            {sessionId && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-xs text-white/50 mb-2">Stripe Session ID</div>
                <div className="font-mono text-sm bg-white/5 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-white/80">{purchaseDetails.session.id}</span>
                  <Button variant="ghost" size="sm" onClick={copySessionId} className="text-white/60 hover:text-white">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Intent */}
            {purchaseDetails.session.payment_intent && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-xs text-white/50 mb-2">Payment Intent ID</div>
                <div className="font-mono text-xs bg-white/5 p-3 rounded-lg text-white/60">
                  {purchaseDetails.session.payment_intent}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white/70">
              You now have access to the purchased content. You can view it in your dashboard or access it directly.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => (window.location.href = `/product-box/${purchaseDetails.purchase.productBoxId}/content`)}
                className="flex-1 bg-white text-black hover:bg-white/90"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Content
              </Button>
              <Button
                onClick={() => (window.location.href = "/dashboard/purchases")}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                View Purchases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
