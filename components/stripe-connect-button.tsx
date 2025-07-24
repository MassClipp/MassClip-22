"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ExternalLink } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface StripeConnectButtonProps {
  isConnected?: boolean
  accountId?: string
  onConnectionChange?: () => void
}

export default function StripeConnectButton({
  isConnected = false,
  accountId,
  onConnectionChange,
}: StripeConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useFirebaseAuth()

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Stripe account",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      console.log("🔗 Initiating Stripe Connect...")

      // Get ID token
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      console.log("📥 API Response:", data)

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to generate connect URL")
      }

      // Check if we got the connectUrl in the response
      if (data.success && data.connectUrl) {
        console.log("✅ Connect URL received, redirecting...")
        console.log("🔗 URL:", data.connectUrl)
        
        // Redirect to Stripe Connect
        window.location.href = data.connectUrl
      } else {
        console.error("❌ No connect URL in response:", data)
        throw new Error("No OAuth URL received from server")
      }
    } catch (error) {
      console.error("❌ Error connecting to Stripe:", error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Stripe",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected && accountId) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600 font-medium">Connected</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://dashboard.stripe.com/connect/accounts/${accountId}`, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Dashboard
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading} className="bg-[#635bff] hover:bg-[#5a54f9] text-white">
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
          </svg>
          Connect with Stripe
        </>
      )}
    </Button>
  )
}
