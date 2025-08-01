"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface PurchaseDetails {
  sessionId: string
  buyerUid: string
  bundleId: string
  sellerId: string
  amount: number
  currency: string
  status: string
}

export default function PurchaseSuccessPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")
  const buyerUidFromUrl = searchParams.get("buyer_uid")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        setError("No session ID provided")
        setLoading(false)
        return
      }

      if (!user) {
        setError("Please log in to view your purchase")
        setLoading(false)
        return
      }

      // CRITICAL: Verify buyer UID matches authenticated user
      if (buyerUidFromUrl && buyerUidFromUrl !== user.uid) {
        console.error("❌ [Purchase Success] Buyer UID mismatch:", {
          urlBuyerUid: buyerUidFromUrl,
          authUserUid: user.uid,
        })
        setError("Purchase verification failed - user mismatch")
        setLoading(false)
        return
      }

      try {
        console.log("🔍 [Purchase Success] Verifying purchase:", {
          sessionId,
          buyerUid: user.uid,
          buyerUidFromUrl,
        })

        const idToken = await user.getIdToken()
        const response = await fetch("/api/purchase/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            idToken,
            buyerUid: user.uid,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Purchase verification failed")
        }

        // CRITICAL: Verify returned buyer UID matches authenticated user
        if (data.buyerUid !== user.uid) {
          console.error("❌ [Purchase Success] Response buyer UID mismatch:", {
            responseBuyerUid: data.buyerUid,
            authUserUid: user.uid,
          })
          throw new Error("Purchase verification failed - authentication mismatch")
        }

        setPurchaseDetails(data)
        console.log("✅ [Purchase Success] Purchase verified:", data)
      } catch (error: any) {
        console.error("❌ [Purchase Success] Verification failed:", error.message)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    verifyPurchase()
  }, [sessionId, user, buyerUidFromUrl])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p>Verifying your purchase...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Purchase Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Purchase Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">Thank you for your purchase. You now have access to your content.</p>

          {purchaseDetails && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Amount:</div>
                <div>
                  ${(purchaseDetails.amount / 100).toFixed(2)} {purchaseDetails.currency.toUpperCase()}
                </div>
                <div className="font-medium">Session:</div>
                <div className="font-mono text-xs">{purchaseDetails.sessionId.substring(0, 20)}...</div>
                <div className="font-medium">Status:</div>
                <Badge variant="outline" className="w-fit">
                  {purchaseDetails.status}
                </Badge>
              </div>

              {user && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Buyer: {user.email}</div>
                    <div>UID: {user.uid.substring(0, 16)}...</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard/purchases">View My Purchases</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
