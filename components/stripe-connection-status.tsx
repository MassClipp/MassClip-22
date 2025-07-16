"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"

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

export function StripeConnectionStatus({ accountStatus, mode, environment, onRefresh }: ConnectionStatusProps) {
  if (!accountStatus) return null

  const getStatusColor = (enabled: boolean) => (enabled ? "text-green-400" : "text-red-400")
  const getStatusIcon = (enabled: boolean) =>
    enabled ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />

  const allEnabled = accountStatus.chargesEnabled && accountStatus.payoutsEnabled && accountStatus.detailsSubmitted
  const needsAttention = accountStatus.requirementsCount > 0

  // Check for environment/mode mismatch
  const isProduction = environment === "production"
  const accountIsLive = accountStatus.livemode
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
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
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

        {needsAttention && !environmentMismatch && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-sm text-yellow-200">
              {accountStatus.requirementsCount} requirement(s) need attention to enable full functionality.
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
      </CardContent>
    </Card>
  )
}
