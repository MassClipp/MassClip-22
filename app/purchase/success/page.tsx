"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, ArrowRight, Play, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [creatorData, setCreatorData] = useState<any>(null)

  useEffect(() => {
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      setError("Invalid session ID")
      setLoading(false)
      return
    }

    const fetchPurchaseData = async () => {
      if (!user) return

      try {
        // Get purchase data
        const purchaseDoc = await getDoc(doc(db, "users", user.uid, "purchases", sessionId))

        if (!purchaseDoc.exists()) {
          setError("Purchase not found")
          setLoading(false)
          return
        }

        const data = purchaseDoc.data()
        setPurchaseData(data)

        // Get creator data
        if (data.creatorId) {
          const creatorDoc = await getDoc(doc(db, "users", data.creatorId))
          if (creatorDoc.exists()) {
            setCreatorData(creatorDoc.data())
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching purchase data:", error)
        setError("Failed to load purchase data")
        setLoading(false)
      }
    }

    fetchPurchaseData()
  }, [searchParams, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h1 className="text-2xl font-bold mb-2">Processing your purchase...</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Please wait while we confirm your payment and grant access to the premium content.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-8">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-zinc-400 text-center max-w-md mb-8">{error}</p>
        <Button onClick={() => router.push("/")}>Return to Home</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-8">
        <CheckCircle className="h-10 w-10 text-green-500" />
      </div>

      <h1 className="text-3xl font-bold mb-2">Purchase Successful!</h1>

      <p className="text-zinc-400 text-center max-w-md mb-8">
        {creatorData ? (
          <>You now have premium access to {creatorData.displayName}'s content.</>
        ) : (
          <>Your purchase was successful. You now have access to the premium content.</>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        {creatorData?.username && (
          <Button
            onClick={() => router.push(`/creator/${creatorData.username}?tab=premium`)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            View Premium Content
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Continue Browsing
        </Button>
      </div>

      <div className="text-xs text-zinc-500 max-w-md text-center">
        If you have any issues with your purchase, please contact support.
      </div>
    </div>
  )
}
