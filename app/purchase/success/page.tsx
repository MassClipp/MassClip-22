"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, RefreshCw, ArrowLeft, ExternalLink, Clock } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
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
  error?: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [purchase, setPurchase] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

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

      console.log(`🔍 Checking purchase status for session: ${sessionId} (attempt ${retryCount + 1})`)

      // Query user's purchases collection for this session
      const purchasesRef = collection(db, "users", user.uid, "purchases")
      const q = query(purchasesRef, where("sessionId", "==", sessionId), limit(1))
      const purchasesSnapshot = await getDocs(q)

      if (purchasesSnapshot.empty) {
        console.log("❌ Purchase not found for session:", sessionId)

        // If we've tried multiple times, show a different message
        if (retryCount >= 3) {
          setError(
            "Purchase verification is taking longer than expected. Your payment was likely successful - please check your purchases or contact support.",
          )
        } else {
          setError("Purchase not found. The payment may still be processing.")
        }
        return
      }

      const purchaseDoc = purchasesSnapshot.docs[0]
      const purchaseData = purchaseDoc.data() as PurchaseData

      console.log("✅ Purchase found:", purchaseData)

      if (purchaseData.status === "complete") {
        setPurchase(purchaseData)
        setError(null)
      } else {
        setError(`Purchase status: ${purchaseData.status}`)
      }
    } catch (err) {
      console.error("❌ Error checking purchase status:", err)
      setError("Failed to check purchase status. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const retryCheck = () => {
    setRetryCount((prev) => prev + 1)
    checkPurchaseStatus()
  }

  // Auto-retry every 3 seconds for the first 30 seconds
  useEffect(() => {
    if (error && !purchase && retryCount < 10) {
      const timer = setTimeout(() => {
        retryCheck()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [error, purchase, retryCount])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-gray-400">Checking your purchase...</p>
          <p className="text-gray-500 text-sm">
            {retryCount > 0 ? `Attempt ${retryCount + 1}` : "This may take a few seconds"}
          </p>
        </div>
      </div>
    )
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            {retryCount >= 3 ? (
              <AlertCircle className="h-8 w-8 text-amber-400" />
            ) : (
              <Clock className="h-8 w-8 text-amber-400" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light text-white">
              {retryCount >= 3 ? "Purchase Verification Delayed" : "Purchase Processing"}
            </h1>
            <p className="text-gray-400 text-sm">
              {error || "We're still processing your purchase. This usually takes a few seconds."}
            </p>
            {retryCount > 0 && (
              <p className="text-gray-500 text-xs">Checked {retryCount + 1} times • Auto-retrying every 3 seconds</p>
            )}
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

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium text-sm">What's happening?</span>
            </div>
            <ul className="text-blue-300/80 text-sm space-y-1">
              <li>• Your payment was processed by Stripe</li>
              <li>• Our system is recording your purchase</li>
              <li>• This usually takes 5-10 seconds</li>
              <li>• You'll get access once processing completes</li>
            </ul>
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
          {purchase.isTestPurchase && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 text-xs">
              🧪 Test Purchase
            </div>
          )}
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
          {purchase.error && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Note</span>
              <span className="text-amber-400 text-xs">Processing issue resolved</span>
            </div>
          )}
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
