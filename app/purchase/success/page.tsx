"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  const sessionId = searchParams?.get("session_id")
  const videoId = searchParams?.get("video_id")

  useEffect(() => {
    // Simulate a brief loading period to show success animation
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white">Processing your purchase...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-white">Purchase Successful!</CardTitle>
          <CardDescription className="text-zinc-400">You now have access to this premium video</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-zinc-400">
            <p>✅ Payment processed</p>
            <p>✅ Video unlocked</p>
            <p>✅ Access granted permanently</p>
          </div>

          <div className="space-y-2">
            <Button onClick={() => router.push(`/video/${videoId}`)} className="w-full bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" />
              Watch Video
            </Button>

            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
