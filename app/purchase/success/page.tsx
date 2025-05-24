"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export default function PurchaseSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [videoData, setVideoData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")
  const videoId = searchParams.get("video_id")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!videoId || !user) {
        setIsLoading(false)
        return
      }

      try {
        // Check if user has access to this video
        const accessRef = doc(db, "userAccess", user.uid, "videos", videoId)
        const accessDoc = await getDoc(accessRef)

        if (!accessDoc.exists()) {
          setError("Purchase verification failed. Please contact support.")
          setIsLoading(false)
          return
        }

        // Get video details
        const videoRef = doc(db, "videos", videoId)
        const videoDoc = await getDoc(videoRef)

        if (videoDoc.exists()) {
          setVideoData(videoDoc.data())
        }
      } catch (err) {
        console.error("Error verifying purchase:", err)
        setError("An error occurred while verifying your purchase.")
      } finally {
        setIsLoading(false)
      }
    }

    // Short delay to ensure webhook has processed
    const timer = setTimeout(() => {
      verifyPurchase()
    }, 2000)

    return () => clearTimeout(timer)
  }, [videoId, user])

  const handleWatchNow = () => {
    if (videoData?.username) {
      router.push(`/creator/${videoData.username}?video=${videoId}`)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="container max-w-md py-16">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 text-green-500 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold mb-2">Processing your purchase...</h1>
            <p className="text-zinc-400 mb-4">Please wait while we verify your payment.</p>
          </>
        ) : error ? (
          <>
            <div className="h-12 w-12 text-red-500 mx-auto mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-zinc-400 mb-6">{error}</p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </>
        ) : (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Purchase Successful!</h1>
            <p className="text-zinc-400 mb-6">
              Thank you for your purchase. You now have access to this premium content.
            </p>
            <div className="flex flex-col space-y-3">
              <Button onClick={handleWatchNow} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Watch Now
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Browse More Content
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
