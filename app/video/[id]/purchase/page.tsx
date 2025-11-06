"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ArrowLeft, Lock, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VideoPurchasePage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [video, setVideo] = useState<any>(null)
  const [creator, setCreator] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return

      try {
        setLoading(true)
        const videoRef = doc(db, "videos", id as string)
        const videoDoc = await getDoc(videoRef)

        if (!videoDoc.exists()) {
          setError("Video not found")
          return
        }

        const videoData = videoDoc.data()
        setVideo({
          id: videoDoc.id,
          ...videoData,
        })

        // Fetch creator info
        if (videoData.uid) {
          const creatorRef = doc(db, "users", videoData.uid)
          const creatorDoc = await getDoc(creatorRef)
          if (creatorDoc.exists()) {
            setCreator({
              id: creatorDoc.id,
              ...creatorDoc.data(),
            })
          }
        }

        // Check if user already has access
        if (user) {
          const accessRef = doc(db, "userAccess", user.uid, "videos", id as string)
          const accessDoc = await getDoc(accessRef)

          if (accessDoc.exists()) {
            // User already has access, redirect to video page
            router.push(`/video/${id}`)
          }
        }
      } catch (err) {
        console.error("Error fetching video:", err)
        setError("Failed to load video")
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [id, user, router])

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=/video/${id}/purchase`)
    }
  }, [user, loading, id, router])

  const handlePurchase = async () => {
    if (!user || !video) return

    try {
      setIsPurchasing(true)
      setError(null)

      // Get the user's ID token
      const idToken = await user.getIdToken()

      // Call the checkout API
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          videoId: video.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      setError(error instanceof Error ? error.message : "Failed to start checkout. Please try again.")
    } finally {
      setIsPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 p-3 rounded-full inline-flex mb-4">
            <Lock className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-zinc-400 mb-6">{error || "This video doesn't exist or has been removed."}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  const price = creator?.premiumPrice || 4.99

  return (
    <div className="min-h-screen bg-black">
      <div className="container max-w-4xl py-8">
        {/* Back button */}
        <Button variant="ghost" className="mb-6 text-zinc-400 hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Video preview */}
          <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden">
            <img
              src={video.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video"}
              alt={video.title}
              className="w-full h-full object-cover opacity-50"
            />

            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="bg-black/40 p-4 rounded-full">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Purchase info */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>

            {creator && (
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden mr-2">
                  {creator.profilePic ? (
                    <img
                      src={creator.profilePic || "/placeholder.svg"}
                      alt={creator.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400">
                      {creator.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <a href={`/creator/${creator.username}`} className="text-zinc-400 hover:text-white transition-colors">
                  {creator.displayName || creator.username}
                </a>
              </div>
            )}

            {video.description && <p className="text-zinc-300 mb-6 whitespace-pre-line">{video.description}</p>}

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-400">Price</span>
                <span className="text-2xl font-bold text-white">${price.toFixed(2)}</span>
              </div>

              <div className="text-sm text-zinc-500 mb-6">
                <p>• One-time purchase</p>
                <p>• Permanent access</p>
                <p>• Support the creator directly</p>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                size="lg"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-1" />
                    Purchase Now
                  </>
                )}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
