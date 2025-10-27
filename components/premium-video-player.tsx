"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Lock, Play, DollarSign, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface PremiumVideoPlayerProps {
  video: {
    id: string
    title: string
    thumbnailUrl: string
    url: string
    type: string
    uid: string
    username: string
    price?: number
  }
}

export default function PremiumVideoPlayer({ video }: PremiumVideoPlayerProps) {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Check if user has access to this premium video
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !video.id) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      try {
        // Check if user has access to this video
        const accessRef = doc(db, "userAccess", user.uid, "videos", video.id)
        const accessDoc = await getDoc(accessRef)

        setHasAccess(accessDoc.exists())
      } catch (error) {
        console.error("Error checking video access:", error)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [user, video.id])

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = `/login?redirect=/creator/${video.username}`
      return
    }

    try {
      setIsPurchasing(true)

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
        throw new Error("Failed to create checkout session")
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      alert("Failed to start checkout. Please try again.")
    } finally {
      setIsPurchasing(false)
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Error playing video:", err))
    }
  }

  if (isLoading) {
    return (
      <div className="aspect-[9/16] bg-zinc-900 rounded-lg flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  // If user has access, show the video
  if (hasAccess) {
    return (
      <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={video.url}
          poster={video.thumbnailUrl}
          controls
          playsInline
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            >
              <Play className="h-8 w-8 text-white" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // If user doesn't have access, show purchase option
  return (
    <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden">
      <img
        src={video.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video"}
        alt={video.title}
        className="w-full h-full object-cover opacity-50"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center">
        <Lock className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">{video.title}</h3>
        <p className="text-zinc-300 mb-6">This is premium content</p>

        <Button
          onClick={handlePurchase}
          disabled={isPurchasing}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
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
              Purchase for ${(video.price || 4.99).toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
