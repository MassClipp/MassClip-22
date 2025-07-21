"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

interface ConnectionStatusProps {
  accountStatus?: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
    livemode?: boolean
  }
  mode?: "live" | "test"
  environment?: string
  onRefresh?: () => void
}

interface StripeConnectionData {
  connected: boolean
  accountId?: string
  status?: string
  requiresAction?: boolean
}

export function StripeConnectionStatus({ accountStatus, mode, environment, onRefresh }: ConnectionStatusProps) {
  const [user, loading] = useAuthState(auth)
  const [connectionData, setConnectionData] = useState<StripeConnectionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConnectionStatus = async () => {
    if (!user) {
      console.log("No user authenticated")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      console.log("🔍 Checking Stripe connection status...")

      const response = await fetch("/api/stripe/connection-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Connection status check failed:", response.status, errorText)
        throw new Error(`Failed to check connection status: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Connection status data:", data)
      setConnectionData(data)
    } catch (error: any) {
      console.error("❌ Error checking Stripe connection:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user && !loading) {
      checkConnectionStatus()
    }
  }, [user, loading])

  const handleRefresh = () => {
    checkConnectionStatus()
    if (onRefresh) {
      onRefresh()
    }
  }

  if (loading) {
    return (
      <Card className="border-gray-600 bg-gray-900/10">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading authentication...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="border-red-600 bg-red-900/10">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>Please log in to check Stripe connection status</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-600 bg-red-900/10">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span>Error checking connection: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="border-gray-600 bg-gray-900/10">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking connection status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Use connectionData if available, otherwise fall back to accountStatus
  const status = connectionData || {
    connected: accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled,
    accountId: undefined,
    status: accountStatus?.detailsSubmitted ? "active" : "pending",
    requiresAction: (accountStatus?.requirementsCount || 0) > 0,
  }

  const getStatusColor = (enabled: boolean) => (enabled ? "text-green-400" : "text-red-400")
  const getStatusIcon = (enabled: boolean) =>
    enabled ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />

  const allEnabled = accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled && accountStatus?.detailsSubmitted
  const needsAttention = (accountStatus?.requirementsCount || 0) > 0

  // Check for environment/mode mismatch
  const isProduction = environment === "production"
  const accountIsLive = accountStatus?.livemode
  const environmentMismatch = (isProduction && !accountIsLive) || (!isProduction && accountIsLive)

  return (
    <Card
      className={`border ${
        environmentMismatch
          ? "border-yellow-600 bg-yellow-900/10"
          : allEnabled
            ? "border-green-600 bg-green-900/10"
            : "border-yellow-600 bg-yellow-900/10"
      }`}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {environmentMismatch ? (
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            ) : allEnabled ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">
                {environmentMismatch ? "Environment Mismatch" : allEnabled ? "Stripe Account Active" : "Setup Required"}
              </span>
              <span className="text-xs text-muted-foreground">
                {mode?.toUpperCase()} mode • {environment}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("https://dashboard.stripe.com", "_blank")}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>

        {environmentMismatch && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-sm text-yellow-200 font-medium mb-1">Environment Mismatch Detected</p>
            <p className="text-xs text-yellow-300">
              Your app is running in {isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode but your Stripe account is in{" "}
              {accountIsLive ? "LIVE" : "TEST"} mode.
            </p>
            <p className="text-xs text-yellow-300 mt-1">
              {isProduction
                ? "Please connect a live Stripe account for production use."
                : "Please use a test Stripe account for development."}
            </p>
          </div>
        )}

        {accountStatus && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className={getStatusColor(accountStatus.chargesEnabled)}>
                {getStatusIcon(accountStatus.chargesEnabled)}
              </span>
              <span>Charges</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={getStatusColor(accountStatus.payoutsEnabled)}>
                {getStatusIcon(accountStatus.payoutsEnabled)}
              </span>
              <span>Payouts</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={getStatusColor(accountStatus.detailsSubmitted)}>
                {getStatusIcon(accountStatus.detailsSubmitted)}
              </span>
              <span>Verified</span>
            </div>
          </div>
        )}

        {needsAttention && !environmentMismatch && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-sm text-yellow-200">
              {accountStatus?.requirementsCount} requirement(s) need attention to enable full functionality.
            </p>
            <Button
              variant="link"
              size="sm"
              className="text-yellow-400 hover:text-yellow-300 p-0 h-auto mt-1"
              onClick={() => window.open("https://dashboard.stripe.com/settings/account", "_blank")}
            >
              Complete setup in Stripe →
            </Button>
          </div>
        )}

        {connectionData && (
          <div className="mt-3 p-2 bg-gray-900/20 border border-gray-600/30 rounded-lg">
            <p className="text-xs text-gray-400">
              Connection Status: {connectionData.connected ? "Connected" : "Not Connected"}
              {connectionData.accountId && ` • Account: ${connectionData.accountId.substring(0, 12)}...`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
