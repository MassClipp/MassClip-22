"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface StripeConnectButtonProps {
  userId: string
  onSuccess?: () => void
}

export function StripeConnectButton({ userId, onSuccess }: StripeConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleConnect = async () => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create onboarding link")
      }

      // Redirect to Stripe Connect OAuth
      window.location.href = data.url
    } catch (error) {
      console.error("Error connecting to Stripe:", error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Stripe",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading} className="w-full">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        "Connect with Stripe"
      )}
    </Button>
  )
}
