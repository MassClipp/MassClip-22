"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, Globe, Shield, CheckCircle, ExternalLink } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding"

export default function ConnectStripePage() {
  const { user } = useFirebaseAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAccount = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe account")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Error creating Stripe account:", err)
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleConnectExisting = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect Stripe account")
      }

      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err) {
      console.error("Error connecting Stripe account:", err)
      setError(err instanceof Error ? err.message : "Failed to connect account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <StripeConnectOnboarding />
    </div>
  )
}
