"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeRequirements {
  eventually_due: string[]
  currently_due: string[]
  past_due: string[]
  pending_verification: string[]
}

interface StripeAccountStatus {
  accountId: string
  needsIdentityVerification: boolean
  requirements: StripeRequirements
  capabilities: {
    charges: string
    transfers: string
  }
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
}

interface OnboardingLink {
  url: string
  expiresAt: number
  createdAt: number
}

export function useStripeOnboarding(accountId?: string) {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeAccountStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onboardingLink, setOnboardingLink] = useState<OnboardingLink | null>(null)

  // Check if cached onboarding link is still valid (5 minutes)
  const isCachedLinkValid = useCallback(() => {
    if (!onboardingLink) return false
    const fiveMinutes = 5 * 60 * 1000
    return Date.now() - onboardingLink.createdAt < fiveMinutes
  }, [onboardingLink])

  // Fetch account requirements
  const checkRequirements = useCallback(async () => {
    if (!user || !accountId) return

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch(`/api/stripe/check-requirements?accountId=${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || "Failed to check requirements")
      }

      const data = await response.json()
      setStatus(data)
    } catch (err) {
      console.error("Error checking Stripe requirements:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [user, accountId])

  // Create onboarding link
  const createOnboardingLink = useCallback(async () => {
    if (!user || !accountId) return null

    // Return cached link if still valid
    if (isCachedLinkValid()) {
      return onboardingLink!.url
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/create-onboarding-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
          accountId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || "Failed to create onboarding link")
      }

      const data = await response.json()

      // Cache the link
      const newLink: OnboardingLink = {
        url: data.url,
        expiresAt: data.expiresAt,
        createdAt: Date.now(),
      }
      setOnboardingLink(newLink)

      return data.url
    } catch (err) {
      console.error("Error creating onboarding link:", err)
      setError(err instanceof Error ? err.message : "Failed to create onboarding link")
      return null
    }
  }, [user, accountId, onboardingLink, isCachedLinkValid])

  // Auto-fetch requirements when accountId changes
  useEffect(() => {
    if (accountId) {
      checkRequirements()
    }
  }, [accountId, checkRequirements])

  return {
    status,
    loading,
    error,
    needsIdentityVerification: status?.needsIdentityVerification || false,
    checkRequirements,
    createOnboardingLink,
    refresh: checkRequirements,
  }
}
