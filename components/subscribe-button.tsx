"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export function SubscribeButton({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to subscribe.",
        variant: "destructive",
      })
      router.push("/login?redirect=/membership-plans")
      return
    }

    setIsLoading(true)

    try {
      // Make sure we have the user's email
      if (!user.email) {
        toast({
          title: "Error",
          description: "Your account doesn't have an email address. Please contact support.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      console.log("Creating checkout session for user:", user.uid, user.email)

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          timestamp: new Date().toISOString(),
          clientId: crypto.randomUUID(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url } = await response.json()
      console.log("Redirecting to checkout URL:", url)
      window.location.href = url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading}
      className={`bg-crimson hover:bg-crimson-dark text-white font-medium py-2 px-6 rounded-md transition-all duration-300 ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`}
    >
      {isLoading ? "Loading..." : children || "Subscribe Now"}
    </button>
  )
}

// Also export as default for backward compatibility
export default SubscribeButton
