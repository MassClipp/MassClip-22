"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PurchaseSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)

  const sessionId = searchParams.get("session_id")
  const videoId = searchParams.get("video_id")

  useEffect(() => {
    // Verify purchase after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Get creator username from videoId
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null)

  useEffect(() => {
    if (videoId) {
      // This would normally fetch the video details to get the creator username
      // For now, we'll just redirect to the home page
      setCreatorUsername("creator")
    }
  }, [videoId])

  return (
    <div className="container max-w-md py-16">
      <div className="bg-black border border-zinc-800 rounded-lg p-8 text-center">
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 text-green-500 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold mb-2">Processing your purchase...</h1>
            <p className="text-zinc-400 mb-4">Please wait while we process your payment.</p>
          </>
        ) : (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Purchase Successful!</h1>
            <p className="text-zinc-400 mb-6">
              Thank you for your purchase. You now have access to this premium content.
            </p>
            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => router.push(`/creator/${creatorUsername}`)}
                className="bg-green-600 hover:bg-green-700"
              >
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
