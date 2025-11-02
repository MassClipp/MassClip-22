"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface StripeConnectionStatus {
  isConnected: boolean
  accountId?: string
  chargesEnabled: boolean
  detailsSubmitted: boolean
  payoutsEnabled: boolean
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  capabilities?: {
    card_payments?: string
    transfers?: string
  }
  country?: string
  default_currency?: string
  email?: string
  business_type?: string
  individual?: {
    first_name?: string
    last_name?: string
    verification?: {
      status?: string
      document?: {
        back?: string
        front?: string
      }
    }
  }
  company?: {
    name?: string
    verification?: {
      document?: {
        back?: string
        front?: string
      }
    }
  }
  tos_acceptance?: {
    date?: number
    ip?: string
    user_agent?: string
  }
}

export default function StripeStatus() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StripeConnectionStatus | null>(null)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    if (!user) return

    setLoading(true)
    setError("")

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setStatus(data)
      } else {
        setError(data.error || "Failed to check Stripe status")
      }
    } catch (error: any) {
      console.error("Stripe status check error:", error)
      setError("Failed to check Stripe connection status")
    } finally {
      setLoading(false)
    }
  }

  const refreshStatus = async () => {
    setRefreshing(true)
    await checkStripeStatus()
    setRefreshing(false)
    toast({
      title: "Status Refreshed",
      description: "Stripe connection status has been updated",
    })
  }

  const handleConnect = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to start Stripe onboarding",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Stripe connect error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to Stripe",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking Stripe connection...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-zinc-900/60 border-red-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="h-5 w-5" />
            Stripe Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-600 bg-red-600/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={checkStripeStatus} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={handleConnect}>Connect Stripe</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status?.isConnected) {
    return (
      <Card className="bg-zinc-900/60 border-yellow-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            Stripe Not Connected
          </CardTitle>
          <CardDescription>Connect your Stripe account to start receiving payments for your content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-yellow-600 bg-yellow-600/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to connect a Stripe account to receive payments from your product sales.
            </AlertDescription>
          </Alert>
          <Button onClick={handleConnect} className="w-full">
            Connect Stripe Account
          </Button>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = () => {
    if (status.chargesEnabled && status.payoutsEnabled) return "text-green-400"
    if (status.detailsSubmitted) return "text-yellow-400"
    return "text-red-400"
  }

  const getStatusIcon = () => {
    if (status.chargesEnabled && status.payoutsEnabled) return <CheckCircle className="h-5 w-5" />
    if (status.detailsSubmitted) return <AlertTriangle className="h-5 w-5" />
    return <XCircle className="h-5 w-5" />
  }

  const getStatusText = () => {
    if (status.chargesEnabled && status.payoutsEnabled) return "Fully Active"
    if (status.detailsSubmitted) return "Pending Verification"
    return "Setup Required"
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          Stripe Connection - {getStatusText()}
        </CardTitle>
        <CardDescription>
          {status.accountId && <span className="font-mono text-sm">Account: {status.accountId}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Charges</span>
              <Badge variant={status.chargesEnabled ? "default" : "destructive"}>
                {status.chargesEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Payouts</span>
              <Badge variant={status.payoutsEnabled ? "default" : "destructive"}>
                {status.payoutsEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Details</span>
              <Badge variant={status.detailsSubmitted ? "default" : "destructive"}>
                {status.detailsSubmitted ? "Submitted" : "Required"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Country</span>
              <span className="text-sm">{status.country?.toUpperCase() || "N/A"}</span>
            </div>
          </div>
        </div>

        {status.requirements && (
          <div className="space-y-2">
            {status.requirements.currently_due.length > 0 && (
              <Alert className="border-red-600 bg-red-600/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Required:</strong> {status.requirements.currently_due.length} items need attention
                </AlertDescription>
              </Alert>
            )}
            {status.requirements.past_due.length > 0 && (
              <Alert className="border-red-600 bg-red-600/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Past Due:</strong> {status.requirements.past_due.length} overdue items
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={refreshStatus} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {!status.chargesEnabled && (
            <Button onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
