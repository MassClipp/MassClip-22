"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface PurchaseDetails {
  productBoxId: string
  productTitle: string
  amount: number
  currency: string
  sessionId: string
  creatorUsername?: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)

  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId || !productBoxId) {
        setError("Missing purchase information")
        setLoading(false)
        return
      }

      try {
        console.log("🔍 [Purchase Success] Verifying purchase:", { sessionId, productBoxId })

        const response = await fetch("/api/purchase/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            productBoxId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Verification failed" }))
          throw new Error(errorData.error || "Failed to verify purchase")
        }

        const data = await response.json()
        setPurchaseDetails(data.purchase)
        console.log("✅ [Purchase Success] Purchase verified:", data.purchase)
      } catch (error) {
        console.error("❌ [Purchase Success] Error:", error)
        setError(error instanceof Error ? error.message : "Failed to verify purchase")
      } finally {
        setLoading(false)
      }
    }

    verifyPurchase()
  }, [sessionId, productBoxId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-light text-white mb-2">Verifying your purchase...</h2>
          <p className="text-zinc-400">Please wait while we confirm your payment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Purchase Verification Failed</CardTitle>
            <CardDescription className="text-zinc-400">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/dashboard/purchases">View My Purchases</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border-zinc-800 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-light text-white mb-2">Purchase Successful!</CardTitle>
          <CardDescription className="text-zinc-400 text-lg">
            Thank you for your purchase. You now have access to premium content.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {purchaseDetails && (
            <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-medium text-white">Purchase Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Product:</span>
                  <p className="text-white font-medium">{purchaseDetails.productTitle}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Amount:</span>
                  <p className="text-white font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: purchaseDetails.currency.toUpperCase(),
                    }).format(purchaseDetails.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Transaction ID:</span>
                  <p className="text-white font-mono text-xs">{purchaseDetails.sessionId}</p>
                </div>
                {purchaseDetails.creatorUsername && (
                  <div>
                    <span className="text-zinc-400">Creator:</span>
                    <p className="text-white font-medium">@{purchaseDetails.creatorUsername}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
            >
              <Link href={`/product-box/${productBoxId}/content`}>
                <Download className="h-4 w-4 mr-2" />
                Access Content
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800">
              <Link href="/dashboard/purchases">
                <ArrowRight className="h-4 w-4 mr-2" />
                View All Purchases
              </Link>
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
              A receipt has been sent to your email address. If you have any issues accessing your content,{" "}
              <Link href="/support" className="text-amber-400 hover:text-amber-300 underline">
                contact support
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
