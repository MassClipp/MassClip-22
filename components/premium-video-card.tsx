"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Lock, DollarSign, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PremiumVideoCardProps {
  video: {
    id: string
    title: string
    thumbnailUrl: string
    price: number
    username: string
    uid: string
  }
  hasAccess: boolean
  className?: string
}

export default function PremiumVideoCard({ video, hasAccess, className }: PremiumVideoCardProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = `/login?redirect=/creator/${video.username}`
      return
    }

    try {
      setIsLoading(true)

      // Get the user's ID token
      const idToken = await user.getIdToken()

      // Call the checkout API
      const response = await fetch("/api/stripe/checkout", {
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
      setIsLoading(false)
    }
  }

  return (
    <div className={`relative group overflow-hidden rounded-lg ${className}`}>
      {/* Thumbnail */}
      <div className="aspect-[9/16] bg-black relative overflow-hidden rounded-lg ring-0 group-hover:ring-1 ring-white/30 transition-all duration-300">
        <img
          src={video.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video"}
          alt={video.title}
          className="w-full h-full object-cover"
        />

        {/* Premium overlay */}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
          <Lock className="h-8 w-8 text-white mb-2" />
          <h3 className="text-white font-medium text-center px-4">{video.title}</h3>

          {hasAccess ? (
            <Button className="mt-4 bg-green-600 hover:bg-green-700">Watch Video</Button>
          ) : (
            <Button onClick={handlePurchase} disabled={isLoading} className="mt-4 bg-amber-500 hover:bg-amber-600">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Buy for ${(video.price / 100).toFixed(2)}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
