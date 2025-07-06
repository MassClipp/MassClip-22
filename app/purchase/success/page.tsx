"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"

interface PurchaseData {
  productBoxId: string
  sessionId: string
  amount: number
  currency: string
  status: string
  itemTitle: string
  itemDescription?: string
  thumbnailUrl?: string
  purchasedAt: any
  isTestPurchase?: boolean
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [purchase, setPurchase] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!user || !sessionId) {
      setError("Missing user authentication or session ID")
      setLoading(false)
      return
    }

    checkPurchaseStatus()
  }, [user, sessionId])

  const checkPurchaseStatus = async () => {
    if (!user || !sessionId) return

    try {
      setLoading(true)
      setError(null)

      // Extract product box ID from session ID if needed, or check all purchases
      // For now, we'll check the user's recent purchases
      const purchasesRef = db.collection("users").doc(user.uid).collection("purchases")
      const purchasesSnapshot = await purchasesRef.where("sessionId", "==", sessionId).limit(1).get()

      if (purchasesSnapshot.empty) {
        // Purchase not found yet - webhook might still be processing
        setError("Purchase not found. The payment may still be processing.")
        return
      }

      const purchaseDoc = purchasesSnapshot.docs[0]
      const purchaseData = purchaseDoc.data() as PurchaseData

      if (purchaseData.status === "complete") {
        setPurchase(purchaseData)
        console.log("✅ Purchase found and completed:", purchaseData)
      } else {
        setError(`Purchase status: ${purchaseData.status}`)
      }
    } catch (err) {
      console.error("❌ Error checking purchase status:", err)
      setError("Failed to check purchase status")
    } finally {
      setLoading(false)
    }
  }

  const retryCheck = () => {
    checkPurchaseStatus()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-gray-400">Checking your purchase...</p>
        </div>
      </div>
    )
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light text-white">Purchase Processing</h1>
            <p className="text-gray-400 text-sm">
              {error || "We're still processing your purchase. This usually takes a few seconds."}
            </p>
          </div>

          {sessionId && (
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Session ID:</div>
              <code className="text-gray-300 text-xs break-all">{sessionId}</code>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={retryCheck} className="w-full bg-gray-800 hover:bg-gray-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
            <div className="flex gap-3">
              <Button asChild variant="ghost" className="flex-1 text-gray-400 hover:text-white hover:bg-gray-900/50">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="ghost" className="flex-1 text-gray-400 hover:text-white hover:bg-gray-900/50">
                <Link href="/dashboard/purchases">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  My Purchases
                </Link>
              </Button>
            </div>
          </div>

          <p className="text-gray-500 text-xs">
            If this persists, your payment was likely successful. Check your purchases or contact support.
          </p>
        </div>
      </div>
    )
  }

  // SUCCESS STATE
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-light text-white">Purchase Complete!</h1>
          <p className="text-gray-400 text-sm">Your payment has been processed successfully</p>
          {purchase.isTestPurchase && <p className="text-amber-400 text-xs">🧪 Test Purchase</p>}
        </div>

        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6 space-y-3 text-left">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Item</span>
            <span className="text-white font-medium text-sm">{purchase.itemTitle}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Amount</span>
            <span className="text-white font-medium">
              ${purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Status</span>
            <span className="text-green-400 text-sm font-medium">Complete</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full bg-white text-black hover:bg-gray-100 font-medium">
            <Link href={`/product-box/${purchase.productBoxId}/content`}>Access Content</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full text-gray-400 hover:text-white hover:bg-gray-900/50">
            <Link href="/dashboard/purchases">View All Purchases</Link>
          </Button>
        </div>

        <div className="pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-xs">
            Need help?{" "}
            <Link href="/support" className="text-gray-400 hover:text-white underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
