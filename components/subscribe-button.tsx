"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useToast } from "@/hooks/use-toast"
import { getAuth, onAuthStateChanged } from "firebase/auth"

interface SubscribeButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  children?: React.ReactNode
}

export default function SubscribeButton({
  variant = "default",
  size = "default",
  className = "",
  children = "Upgrade to Pro",
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { upgradeToPro, isProUser } = useUserPlan()
  const { toast } = useToast()
  const auth = getAuth()

  // Check authentication status when component mounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user)
    })

    return () => unsubscribe()
  }, [auth])

  const handleSubscribe = async () => {
    // If already a pro user, show a message
    if (isProUser) {
      toast({
        title: "Already Subscribed",
        description: "You're already on the Pro plan!",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get the current user
      const user = auth.currentUser

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to upgrade to Pro",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      console.log("Starting subscription process for user:", user.uid)

      // Force refresh the token to ensure it's valid
      const idToken = await user.getIdToken(true)
      console.log("Got fresh ID token")

      // Call our API to create a checkout session
      // IMPORTANT: Explicitly set method to POST and include proper headers
      const response = await fetch("/api/create-checkout-session", {
        method: "POST", // Ensure this is explicitly set to POST
        headers: {
          "Content-Type": "application/json", // Ensure proper content type
          Authorization: `Bearer ${idToken}`, // Include authorization token
        },
        body: JSON.stringify({
          // Properly stringify the body
          userId: user.uid, // Include userId in the body
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            // If we can't get text either, use the default error message
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (!data.url) {
        throw new Error("No checkout URL returned from server")
      }

      // Redirect to Stripe checkout
      console.log("Redirecting to Stripe checkout")
      window.location.href = data.url
    } catch (error) {
      console.error("Error starting subscription:", error)
      toast({
        title: "Subscription Error",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      className={`vault-button inline-block scale-90 ${className}`}
      disabled={isLoading || !isAuthenticated}
    >
      <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300 bg-transparent">
        {isLoading ? "Processing..." : !isAuthenticated ? "Login Required" : children}
      </span>
    </button>
  )
}
