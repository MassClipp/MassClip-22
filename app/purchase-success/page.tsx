"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface PurchaseVerification {
  success: boolean
  bundleId?: string
  bundleTitle?: string
  creatorId?: string
  sessionId?: string
  buyerUid?: string
  error?: string
}

export default function PurchaseSuccessPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [verification, setVerification] = useState<PurchaseVerification | null>(null)
  const [loading, setLoading] = useState(true)

  const sessionId = searchParams.get("session_id")
  const buyerUidFromUrl = searchParams.get("buyer_uid")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        setVerification({
          success: false,
          error: "No session ID provided",
        })
        setLoading(false)
        return
      }

      // CRITICAL: Verify buyer UID matches authenticated user
      if (!user) {
        setVerification({
          success: false,
          error: "Authentication required to verify purchase",
        })
        setLoading(false)
        return
      }

      if (buyerUidFromUrl && buyerUidFromUrl !== user.uid) {
        console.error("❌ [Purchase Success] Buyer UID mismatch:")
        console.error("   URL UID:", buyerUidFromUrl)
        console.error("   Auth UID:", user.uid)
        setVerification({
          success: false,
          error: "Purchase verification failed - user mismatch",
        })
        setLoading(false)
        return
      }

      try {
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
          throw new Error(errorData.error || "Purchase verification failed")
        }

        const data = await response.json()
        console.log("✅ [Purchase Success] Purchase verified:", data)

        // CRITICAL: Verify buyer UID in response
        if (data.buyerUid !== user.uid) {
          throw new Error("Purchase verification failed - buyer UID mismatch")
        }

        setVerification({
          success: true,
          bundleId: data.bundleId,
          bundleTitle: data.bundleTitle,
          creatorId: data.creatorId,
          sessionId: data.sessionId,
          buyerUid: data.buyerUid,
        })
      } catch (error: any) {
        console.error("❌ [Purchase Success] Verification failed:", error)
        setVerification({
          success: false,
          error: error.message || "Failed to verify purchase",
        })
      } finally {
        setLoading(false)
      }
    }

    verifyPurchase()
  }, [sessionId, buyerUidFromUrl, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Verifying your purchase...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!verification) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <p>Unable to verify purchase</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!verification.success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Purchase Verification Failed
            </CardTitle>
            <CardDescription>There was an issue verifying your purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{verification.error}</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/purchases">View Purchases</Link>
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
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Purchase Successful!
          </CardTitle>
          <CardDescription>Your purchase has been completed and verified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {verification.bundleTitle && (
              <p>
                <strong>Bundle:</strong> {verification.bundleTitle}
              </p>
            )}
            <p>
              <strong>Session ID:</strong> {verification.sessionId}
            </p>
            <p>
              <strong>Buyer ID:</strong> {verification.buyerUid}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/purchases">View My Purchases</Link>
            </Button>
            {verification.creatorId && (
              <Button variant="outline" asChild>
                <Link href={`/creator/${verification.creatorId}`}>View Creator</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
