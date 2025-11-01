"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, Shield, CheckCircle, AlertTriangle } from "lucide-react"

interface SSNCompletionPromptProps {
  accountId: string
}

export default function SSNCompletionPrompt({ accountId }: SSNCompletionPromptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [linkCreated, setLinkCreated] = useState(false)

  const handleCreateAccountLink = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/stripe/create-account-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to create verification link")
      }

      // Open the Stripe verification link in a new tab
      window.open(data.url, "_blank")
      setLinkCreated(true)
    } catch (error) {
      console.error("Error creating account link:", error)
      setError(error instanceof Error ? error.message : "Failed to create verification link")
    } finally {
      setLoading(false)
    }
  }

  if (linkCreated) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Verification Link Created
          </CardTitle>
          <CardDescription>Complete your identity verification with Stripe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              A new tab should have opened with Stripe's verification form. Complete the form to finish setting up your
              account.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">What to expect:</h4>
            <ul className="space-y-1 text-sm text-blue-300">
              <li>• Provide your SSN or ITIN</li>
              <li>• Verify your personal information</li>
              <li>• Add bank account details for payouts</li>
              <li>• Complete any additional requirements</li>
            </ul>
          </div>

          <p className="text-sm text-zinc-400">
            Once you complete the verification, return to this page. Your account status will update automatically.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Complete Account Verification
        </CardTitle>
        <CardDescription>Finish setting up your Stripe account to receive payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Complete your identity verification with Stripe to start accepting payments and receiving payouts.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium text-white">You'll need to provide:</h4>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Social Security Number (SSN) or Individual Taxpayer Identification Number (ITIN)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Personal information (address, date of birth)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Bank account information for receiving payouts
            </li>
          </ul>
        </div>

        <Button
          onClick={handleCreateAccountLink}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Verification Link...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Verification with Stripe
            </>
          )}
        </Button>

        <p className="text-xs text-zinc-400 text-center">
          You'll be redirected to Stripe's secure verification form. All information is encrypted and handled directly
          by Stripe.
        </p>
      </CardContent>
    </Card>
  )
}
