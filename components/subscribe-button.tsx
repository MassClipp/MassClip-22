"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export function SubscribeButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubscription = async () => {
    if (!user) {
      router.push("/login?redirect=/pricing")
      return
    }

    try {
      setIsLoading(true)
      console.log("Creating checkout session for user:", user.uid, "with email:", user.email)

      // Ensure we have valid data to send
      if (!user.uid || !user.email) {
        toast({
          title: "Missing user information",
          description: "Please ensure you're properly logged in and try again.",
          variant: "destructive",
        })
        throw new Error("Missing user ID or email")
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Checkout session error:", response.status, errorText)
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.url) {
        console.log("Redirecting to checkout URL:", data.url)
        window.location.href = data.url
      } else {
        console.error("No URL in response:", data)
        alert("Something went wrong. Please try again.")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Checkout Error",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSubscription} disabled={isLoading} className={className || "w-full"} variant="default">
      {isLoading ? "Loading..." : children || "Subscribe Now"}
    </Button>
  )
}
