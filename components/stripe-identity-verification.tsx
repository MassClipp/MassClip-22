"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface StripeIdentityVerificationProps {
  accountId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function StripeIdentityVerification({
  accountId,
  onSuccess,
  onCancel,
}: StripeIdentityVerificationProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [verificationUrl, setVerificationUrl] = useState<string>("")

  const handleCreateVerificationLink = async () => {
    if (!user) {
      setError("You must be logged in to verify your identity")
      return
    }

    try {
      setLoading(true)
      setError("")

      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/create-identity-verification-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-User-ID": user.uid,
        },
        body: JSON.stringify({ accountId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to create verification link")
      }

      setVerificationUrl(data.verificationUrl)

      // Automatically redirect to Stripe for verification
      window.open(data.verificationUrl, "_blank")

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (error) {
      console.error("Error creating verification link:", error)
      setError(error instanceof Error ? error.message : "Failed to create verification link")
    } finally {
      setLoading(false)
    }
  }

  if (verificationUrl) {
    return (
      <div className="space-y-6 p-6">
        <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Verification link created successfully! A new tab should have opened with Stripe's verification form.
          </AlertDescription>
        </Alert>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-400 flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4" />
            Complete Your Verification
          </h4>
          <ul className="space-y-2 text-sm text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Complete the identity verification form in the new tab
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              You'll need to provide your SSN/ITIN and other required information
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Stripe will verify your identity (typically takes 1-2 business days)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Return to this page once you've completed the form
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(verificationUrl, "_blank")}
            className="flex-1"
            disabled={loading}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Verification Form
          </Button>
          <Button onClick={() => onSuccess?.()} className="flex-1">
            I've Completed Verification
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Message */}
      {error && (
        <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Notice */}
      <Alert className="bg-blue-500/10 text-blue-500 border-blue-500/20">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          We'll redirect you to Stripe's secure verification form where you can safely provide your identity information
          including SSN/ITIN.
        </AlertDescription>
      </Alert>

      <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          What You'll Need
        </h4>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            Social Security Number (SSN) or Individual Taxpayer Identification Number (ITIN)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            Personal information (name, address, date of birth)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            Bank account information for payouts
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            Government-issued ID (may be required for some accounts)
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleCreateVerificationLink} disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Link...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Start Identity Verification
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-zinc-400 text-center">
        You'll be redirected to Stripe's secure verification form. All information is encrypted and handled directly by
        Stripe.
      </p>
    </div>
  )
}
