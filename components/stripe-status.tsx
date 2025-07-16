"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2, AlertTriangle, CreditCard, ExternalLink } from "lucide-react"

interface StripeConnectionStatus {
  isConnected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requiresAction: boolean
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  }
  capabilities?: {
    card_payments: string
    transfers: string
  }
  loading: boolean
  error?: string
}

export default function StripeStatus() {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeConnectionStatus>({
    isConnected: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    requiresAction: false,
    loading: true,
  })

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    try {
      setStatus((prev) => ({ ...prev, loading: true, error: undefined }))

      const token = await user?.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch Stripe status")
      }

      const data = await response.json()
      setStatus({
        isConnected: data.isConnected || false,
        accountId: data.accountId,
        chargesEnabled: data.chargesEnabled || false,
        payoutsEnabled: data.payoutsEnabled || false,
        requiresAction: data.requiresAction || false,
        requirements: data.requirements,
        capabilities: data.capabilities,
        loading: false,
      })
    } catch (error: any) {
      console.error("Error checking Stripe status:", error)
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to check Stripe status",
      }))
    }
  }

  const handleConnectStripe = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to create onboarding link")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error("Error connecting Stripe:", error)
      setStatus((prev) => ({
        ...prev,
        error: error.message || "Failed to connect Stripe",
      }))
    }
  }

  if (status.loading) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-zinc-400">Checking Stripe status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status.error) {
    return (
      <Card className="bg-zinc-900/60 border-red-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="h-5 w-5" />
            Stripe Status Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-600 bg-red-600/10">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
          <Button onClick={checkStripeStatus} className="mt-4 bg-transparent" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!status.isConnected) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Connect Stripe Account
          </CardTitle>
          <CardDescription>Connect your Stripe account to start receiving payments for your content.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnectStripe} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect Stripe
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Stripe Account Connected
        </CardTitle>
        <CardDescription>Your Stripe account is connected and ready to receive payments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-zinc-400">Charges</div>
            <Badge variant={status.chargesEnabled ? "default" : "destructive"}>
              {status.chargesEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-zinc-400">Payouts</div>
            <Badge variant={status.payoutsEnabled ? "default" : "destructive"}>
              {status.payoutsEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        {status.accountId && (
          <div className="space-y-2">
            <div className="text-sm text-zinc-400">Account ID</div>
            <div className="font-mono text-sm bg-zinc-800/50 p-2 rounded">{status.accountId}</div>
          </div>
        )}

        {status.requiresAction && status.requirements && (
          <Alert className="border-yellow-600 bg-yellow-600/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Action Required</div>
                {status.requirements.currently_due.length > 0 && (
                  <div>
                    <div className="text-sm font-medium">Currently Due:</div>
                    <ul className="text-sm list-disc list-inside">
                      {status.requirements.currently_due.map((req, index) => (
                        <li key={index}>{req.replace(/_/g, " ")}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={checkStripeStatus} variant="outline" size="sm">
            Refresh Status
          </Button>
          {status.requiresAction && (
            <Button onClick={handleConnectStripe} size="sm">
              Complete Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
