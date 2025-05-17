"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ShoppingCart } from "lucide-react"

interface ClipPackPurchaseButtonProps {
  clipPackId: string
  price: number
  creatorId: string
}

export default function ClipPackPurchaseButton({ clipPackId, price, creatorId }: ClipPackPurchaseButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to login
      router.push(`/login?redirect=${encodeURIComponent(`/clip-pack/${clipPackId}`)}`)
      return
    }

    setIsLoading(true)

    try {
      // Create checkout session
      const response = await fetch("/api/create-clip-pack-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clipPackId,
          creatorId,
          price,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Redirect to checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("Failed to create checkout session")
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error instanceof Error ? error.message : "Failed to process purchase",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button className="w-full bg-crimson hover:bg-crimson/90 text-white" onClick={handlePurchase} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase Now
        </>
      )}
    </Button>
  )
}
