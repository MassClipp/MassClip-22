"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  CreditCard,
  Building,
  User,
  Calendar,
  DollarSign,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface StripeAccount {
  id: string
  email?: string
  country: string
  default_currency: string
  type: string
  business_type?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  capabilities: {
    card_payments?: string
    transfers?: string
  }
  created: number
  metadata: Record<string, string>
}

interface StripeStatusData {
  connected: boolean
  account?: StripeAccount
  error?: string
  onboardingUrl?: string
  dashboardUrl?: string
  mode: "live" | "test"
}

export default function StripeStatus() {
  const [status, setStatus] = useState<StripeStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchStripeStatus = async (showRefreshToast = false) => {
    try {
      setRefreshing(true)
      const response = await fetch("/api/stripe/connect/status")
      const data = await response.json()
      setStatus(data)

      if (showRefreshToast) {
        toast({
          title: "Status Updated",
          description: "Stripe connection status has been refreshed",
        })
      }
    } catch (error) {
      console.error("Failed to fetch Stripe status:", error)
      setStatus({
        connected: false,
        error: "Failed to fetch Stripe status",
        mode: "test",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStripeStatus()
  }, [])

  const handleRefresh = () => {
    fetchStripeStatus(true)
  }

  const handleOnboarding = async () => {
    try {
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create onboarding link",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start onboarding process",
        variant: "destructive",
      })
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusColor = (enabled: boolean) => {
    return enabled ? "text-green-400" : "text-red-400"
  }

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <span className="ml-2 text-zinc-400">Loading Stripe status...</span>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className="bg-zinc-900/60 border-red-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="h-5 w-5" />
            Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400">Unable to fetch Stripe connection status.</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
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
            Stripe Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-600 bg-red-600/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleOnboarding}>Connect Stripe Account</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status.connected || !status.account) {
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              {status.mode.toUpperCase()} MODE
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOnboarding} className="flex-1">
              <CreditCard className="h-4 w-4 mr-2" />
              Connect Stripe Account
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const account = status.account
  const isFullySetup = account.charges_enabled && account.payouts_enabled && account.details_submitted
  const hasRequirements = account.requirements.currently_due.length > 0 || account.requirements.past_due.length > 0

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className={`bg-zinc-900/60 ${isFullySetup ? "border-green-800/50" : "border-yellow-800/50"}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${isFullySetup ? "text-green-400" : "text-yellow-400"}`}>
              {isFullySetup ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              Stripe Account {isFullySetup ? "Connected" : "Setup Required"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                {status.mode.toUpperCase()} MODE
              </Badge>
              <Button onClick={handleRefresh} variant="ghost" size="sm">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            {isFullySetup
              ? "Your Stripe account is fully set up and ready to receive payments."
              : "Complete your Stripe account setup to start receiving payments."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Account ID:</span>
                <span className="font-mono text-sm">{account.id}</span>
              </div>
              {account.email && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Email:</span>
                  <span className="text-sm">{account.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Created:</span>
                <span className="text-sm">{formatDate(account.created)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Country:</span>
                <span className="text-sm">{account.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Currency:</span>
                <span className="text-sm">{account.default_currency.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Type:</span>
                <span className="text-sm capitalize">{account.type}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Capabilities Status */}
          <div>
            <h4 className="text-sm font-medium mb-3">Account Capabilities</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(account.charges_enabled)}
                <span className={`text-sm ${getStatusColor(account.charges_enabled)}`}>
                  {account.charges_enabled ? "Charges Enabled" : "Charges Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(account.payouts_enabled)}
                <span className={`text-sm ${getStatusColor(account.payouts_enabled)}`}>
                  {account.payouts_enabled ? "Payouts Enabled" : "Payouts Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(account.details_submitted)}
                <span className={`text-sm ${getStatusColor(account.details_submitted)}`}>
                  {account.details_submitted ? "Details Complete" : "Details Incomplete"}
                </span>
              </div>
            </div>
          </div>

          {/* Requirements */}
          {hasRequirements && (
            <>
              <Separator className="bg-zinc-800" />
              <div>
                <h4 className="text-sm font-medium mb-3 text-yellow-400">Action Required</h4>
                <div className="space-y-2">
                  {account.requirements.currently_due.length > 0 && (
                    <Alert className="border-yellow-600 bg-yellow-600/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Currently Due:</strong> {account.requirements.currently_due.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                  {account.requirements.past_due.length > 0 && (
                    <Alert className="border-red-600 bg-red-600/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Past Due:</strong> {account.requirements.past_due.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isFullySetup && status.onboardingUrl && (
              <Button onClick={() => window.open(status.onboardingUrl, "_blank")} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            )}
            {status.dashboardUrl && (
              <Button onClick={() => window.open(status.dashboardUrl, "_blank")} variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Stripe Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
