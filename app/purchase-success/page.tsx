"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, AlertCircle, Loader2, Download, ArrowLeft, User, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PurchaseDetails {
  sessionId: string
  bundleId: string
  bundleTitle: string
  amount: number
  currency: string
  buyerUid: string
  creatorId: string
  purchaseDate: string
  status: string
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const sessionId = searchParams.get("session_id")
  const buyerUidFromUrl = searchParams.get("buyer_uid")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        setError("No session ID provided")
        setLoading(false)
        return
      }

      // CRITICAL: Require user authentication
      if (!user) {
        setError("Please log in to view your purchase")
        setLoading(false)
        return
      }

      // CRITICAL: Verify buyer UID matches authenticated user
      if (buyerUidFromUrl && buyerUidFromUrl !== user.uid) {
        console.error("🚨 [Purchase Success] Buyer UID mismatch!")
        console.error("   URL Buyer UID:", buyerUidFromUrl)
        console.error("   Authenticated User UID:", user.uid)
        setError("Purchase verification failed - user mismatch")
        setLoading(false)
        return
      }

      try {
        setVerifying(true)
        console.log("🔍 [Purchase Success] Verifying purchase...")
        console.log("   Session ID:", sessionId)
        console.log("   Buyer UID:", user.uid)

        const idToken = await user.getIdToken()

        const response = await fetch("/api/purchase/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            sessionId,
            buyerUid: user.uid, // CRITICAL: Include buyer UID for verification
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("❌ [Purchase Success] Verification failed:", errorData)

          if (response.status === 401) {
            setError("Authentication failed. Please log in again.")
            router.push("/login")
            return
          }

          if (response.status === 403) {
            setError("This purchase belongs to a different user")
            return
          }

          throw new Error(errorData.error || "Purchase verification failed")
        }

        const data = await response.json()
        console.log("✅ [Purchase Success] Purchase verified:", data)

        // CRITICAL: Verify buyer UID in response matches authenticated user
        if (data.buyerUid !== user.uid) {
          console.error("🚨 [Purchase Success] Response buyer UID mismatch!")
          setError("Purchase verification failed - authentication mismatch")
          return
        }

        setPurchaseDetails(data)

        toast({
          title: "Purchase Successful!",
          description: `You now have access to ${data.bundleTitle}`,
        })
      } catch (error: any) {
        console.error("❌ [Purchase Success] Error:", error)
        setError(error.message || "Failed to verify purchase")
      } finally {
        setLoading(false)
        setVerifying(false)
      }
    }

    verifyPurchase()
  }, [sessionId, buyerUidFromUrl, user, router, toast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-center text-muted-foreground">
              {verifying ? "Verifying your purchase..." : "Loading..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Purchase Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push("/dashboard")} className="w-full" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            {!user && (
              <Button onClick={() => router.push("/login")} className="w-full">
                Log In
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchaseDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Purchase Not Found</CardTitle>
            <CardDescription>We couldn't find details for this purchase.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/purchases")} className="w-full">
              View All Purchases
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-700">Purchase Successful!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for your purchase. You now have access to your content.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Purchase Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Purchase Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Bundle:</span>
                <p className="font-medium">{purchaseDetails.bundleTitle}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-medium">
                  {(purchaseDetails.amount / 100).toFixed(2)} {purchaseDetails.currency.toUpperCase()}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Purchase Date:</span>
                <p className="font-medium">{new Date(purchaseDetails.purchaseDate).toLocaleDateString()}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {purchaseDetails.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Buyer Verification */}
          {user && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold flex items-center text-blue-700">
                <User className="h-4 w-4 mr-2" />
                Verified Buyer
              </h3>
              <div className="text-sm text-blue-600">
                <p>Purchased by: {user.email}</p>
                <p className="text-xs text-blue-500">Buyer ID: {purchaseDetails.buyerUid}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => router.push(`/bundles/${purchaseDetails.bundleId}`)} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Access Content
            </Button>

            <Button onClick={() => router.push("/dashboard/purchases")} variant="outline" className="flex-1">
              View All Purchases
            </Button>
          </div>

          {/* Session Info for Debugging */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <p>Session ID: {purchaseDetails.sessionId}</p>
              <p>Bundle ID: {purchaseDetails.bundleId}</p>
              <p>Buyer UID: {purchaseDetails.buyerUid}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
