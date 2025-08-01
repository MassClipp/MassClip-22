"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface PurchaseVerification {
  success: boolean
  message: string
  details?: any
  buyerUid?: string
  bundleId?: string
  sessionId?: string
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
          message: "No session ID provided",
          details: "Invalid purchase verification URL",
        })
        setLoading(false)
        return
      }

      if (!user) {
        setVerification({
          success: false,
          message: "Authentication required",
          details: "Please log in to verify your purchase",
        })
        setLoading(false)
        return
      }

      // Verify buyer UID matches authenticated user
      if (buyerUidFromUrl && buyerUidFromUrl !== user.uid) {
        console.error("❌ Buyer UID mismatch:", {
          urlBuyerUid: buyerUidFromUrl,
          authUserUid: user.uid,
        })

        setVerification({
          success: false,
          message: "Unauthorized purchase access",
          details: "This purchase belongs to a different user",
        })
        setLoading(false)
        return
      }

      try {
        console.log("🔍 Verifying purchase session:", sessionId)

        const response = await fetch("/api/purchase/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            expectedBuyerUid: user.uid,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          console.log("✅ Purchase verified successfully")
          setVerification({
            success: true,
            message: "Purchase completed successfully!",
            details: data,
            buyerUid: data.buyerUid,
            bundleId: data.bundleId,
            sessionId: data.sessionId,
          })
        } else {
          console.error("❌ Purchase verification failed:", data)
          setVerification({
            success: false,
            message: data.error || "Purchase verification failed",
            details: data.details || "Unknown error occurred",
          })
        }
      } catch (error: any) {
        console.error("❌ Error verifying purchase:", error.message)
        setVerification({
          success: false,
          message: "Verification error",
          details: error.message,
        })
      }

      setLoading(false)
    }

    verifyPurchase()
  }, [sessionId, buyerUidFromUrl, user])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Verifying your purchase...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!verification) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
              <p>Unable to verify purchase</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {verification.success ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            <CardTitle>{verification.success ? "Purchase Successful!" : "Purchase Failed"}</CardTitle>
          </div>
          <CardDescription>{verification.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verification.success && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {verification.sessionId && (
                    <div>
                      <p className="text-sm font-medium">Session ID</p>
                      <Badge variant="outline">{verification.sessionId}</Badge>
                    </div>
                  )}
                  {verification.buyerUid && (
                    <div>
                      <p className="text-sm font-medium">Buyer ID</p>
                      <Badge variant="outline">{verification.buyerUid}</Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild>
                    <Link href="/dashboard/purchases">View My Purchases</Link>
                  </Button>
                  {verification.bundleId && (
                    <Button variant="outline" asChild>
                      <Link href={`/product-box/${verification.bundleId}/content`}>Access Content</Link>
                    </Button>
                  )}
                </div>
              </>
            )}

            {!verification.success && (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-800">{verification.details}</p>
                </div>

                <div className="flex gap-2">
                  <Button asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/support">Contact Support</Link>
                  </Button>
                </div>
              </div>
            )}

            {verification.details && typeof verification.details === "object" && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(verification.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
