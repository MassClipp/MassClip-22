"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Crown, Loader2 } from "lucide-react"

interface SubscriptionButtonProps {
  isPro?: boolean
  className?: string
}

export function SubscriptionButton({ isPro = false, className }: SubscriptionButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    setLoading(true)
    try {
      // Redirect to pricing page
      router.push("/pricing")
    } catch (error) {
      console.error("Error upgrading subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isPro) {
    return (
      <Button
        variant="outline"
        className={`border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 ${className}`}
        disabled
      >
        <Crown className="h-4 w-4 mr-2" />
        Pro Member
      </Button>
    )
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      className={`bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </>
      )}
    </Button>
  )
}
