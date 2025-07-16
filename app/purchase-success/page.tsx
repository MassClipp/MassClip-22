"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-firebase-auth"
import { CheckCircle, XCircle, AlertTriangle, Eye, ArrowRight } from "lucide-react"

interface PurchaseData {
  success: boolean
  session?: {
    id: string
    amount: number
    currency: string
    status: string
    customer_email: string
    payment_intent: string
  }
  purchase?: {
    productBoxId: string
    userId: string | null
    purchaseId: string
    connectedAccountId?: string
  }
  productBox?: {
    title: string
    description: string
    creatorId: string
  }
  error?: string
  details?: string
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        setError("No session ID provided in URL")
        setLoading(false)
        return
      }

      if (!productBoxId) {
        setError("No product box ID provided in URL")
        setLoading(false)
        return
      }

      try {
        console.log(`🔍 [Purchase Success] Verifying purchase: ${sessionId}`)

        // Get ID token if user is authenticated
        let idToken = null
        if (user) {
          try {
            idToken = await user.getIdToken()
          } catch (tokenError) {
            console.warn("Failed to get ID token:", tokenError)
          }
        }

        const response = await fetch("/api/purchase/verify-and-complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            productBoxId,
            idToken,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setPurchaseData(data)
          console.log("✅ [Purchase Success] Purchase verified successfully")
        } else {
          setError(data.error || "Failed to verify purchase")
          setPurchaseData(data)
          console.error("❌ [Purchase Success] Verification failed:", data.error)
        }
      } catch (err: any) {
        console.error("❌ [Purchase Success] Network error:", err)
        setError("Network error occurred while verifying purchase")
      } finally {
        setLoading(false)
      }
    }

    // Wait for auth to load before verifying purchase
    if (!authLoading) {
      verifyPurchase()
    }
  }, [sessionId, productBoxId, user, authLoading])

  const handleViewContent = () => {
    if (productBoxId) {
      router.push(`/product-box/${productBoxId}/content`)
    }
  }

  const handleGoToDashboard = () => {
    router.push("/dashboard")
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  if (loading || authLoading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !purchaseData) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-red-600">Purchase Verification Failed</CardTitle>
            </div>
            <CardDescription>There was an issue verifying your purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Debug Information:</p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>Session ID: {sessionId || "Not provided"}</div>
                <div>Product Box ID: {productBoxId || "Not provided"}</div>
                <div>User: {user ? `${user.email} (${user.uid})` : "Anonymous"}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => router.push("/")} variant="outline">
                Go Home
              </Button>
              <Button onClick={() => window.location.reload()}>Retry Verification</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchaseData?.success) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-red-600">Purchase Not Completed</CardTitle>
            </div>
            <CardDescription>Your payment was not successfully processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {purchaseData?.error || "Unknown error occurred during purchase verification"}
              </AlertDescription>
            </Alert>

            {purchaseData?.session && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Details:</p>
                <div className="bg-muted p-3 rounded text-sm">
                  <div>Session ID: {purchaseData.session.id}</div>
                  <div>
                    Status: <Badge variant="destructive">{purchaseData.session.status}</Badge>
                  </div>
                  <div>Amount: {formatAmount(purchaseData.session.amount, purchaseData.session.currency)}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => router.push("/")} variant="outline">
                Go Home
              </Button>
              {productBoxId && <Button onClick={() => router.push(`/product-box/${productBoxId}`)}>Try Again</Button>}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success case
  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-6">
      {/* Success Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <CardTitle className="text-green-600 text-2xl">Purchase Successful!</CardTitle>
              <CardDescription>Your payment has been processed and access has been granted</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Purchase Summary */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{purchaseData.productBox?.title}</h3>
              <p className="text-muted-foreground">{purchaseData.productBox?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount Paid:</span>
                <div className="font-semibold">
                  {purchaseData.session && formatAmount(purchaseData.session.amount, purchaseData.session.currency)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Status:</span>
                <div>
                  <Badge className="bg-green-100 text-green-800">{purchaseData.session?.status || "Completed"}</Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <div className="font-medium">{user?.email || purchaseData.session?.customer_email || "Anonymous"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Transaction ID:</span>
                <div className="font-mono text-xs">{purchaseData.session?.payment_intent?.slice(-8) || "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleViewContent} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              View Content
            </Button>
            {user && (
              <Button onClick={handleGoToDashboard} variant="outline">
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
          </div>

          {/* User Status */}
          <Alert>
            <AlertDescription>
              {user ? (
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Content has been added to your account and is accessible from your dashboard.
                </span>
              ) : (
                <span className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                  You purchased as a guest. Bookmark this page or create an account to easily access your content later.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Debug Information (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(purchaseData, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
