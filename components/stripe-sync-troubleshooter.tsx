"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle, CheckCircle, ExternalLink, RefreshCw, Zap } from "lucide-react"

interface DiagnosticResult {
  success: boolean
  timestamp: string
  user: {
    uid: string
    email: string
    username: string
  }
  stripe: {
    accountId: string
    accountStatus: {
      id: string
      charges_enabled: boolean
      payouts_enabled: boolean
      details_submitted: boolean
      requirements: {
        currently_due: string[]
        eventually_due: string[]
        past_due: string[]
        disabled_reason: string | null
      }
      capabilities: Record<string, string>
    }
    apiTest: {
      success: boolean
      message: string
      error?: string
      code?: string
    }
    canAcceptPayments: boolean
    readyForSync: boolean
    blockers: string[]
  }
  products: {
    unsyncedCount: number
    unsyncedBoxes: Array<{
      id: string
      title: string
      price: number
      stripeStatus: string
      stripeError: string | null
    }>
  }
  nextSteps: string[]
}

export function StripeSyncTroubleshooter() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/diagnostic", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to run diagnostic")
      }

      const data = await response.json()
      console.log("📊 [Stripe Diagnostic] Results:", data)
      setDiagnosticResult(data)
    } catch (error) {
      console.error("❌ [Stripe Diagnostic] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to run diagnostic")
      toast({
        title: "Diagnostic Failed",
        description: error instanceof Error ? error.message : "Failed to run diagnostic",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const syncAllProducts = async () => {
    if (!user || !diagnosticResult?.stripe.readyForSync) return

    try {
      setSyncing(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/bulk-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sync products")
      }

      const data = await response.json()
      console.log("✅ [Stripe Sync] Bulk sync result:", data)

      toast({
        title: "Sync Complete",
        description: `${data.syncedCount} products synced successfully${
          data.failedCount > 0 ? `, ${data.failedCount} failed` : ""
        }`,
      })

      // Refresh diagnostic after sync
      setTimeout(runDiagnostic, 1000)
    } catch (error) {
      console.error("❌ [Stripe Sync] Error:", error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync products",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDiagnostic()
    }
  }, [user])

  const openStripeAccount = () => {
    if (diagnosticResult?.stripe.accountId) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${diagnosticResult.stripe.accountId}`, "_blank")
    }
  }

  const openStripeOnboarding = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/create-account-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create account link")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No account link URL returned")
      }
    } catch (error) {
      console.error("❌ [Stripe Onboarding] Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account link",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !diagnosticResult) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Diagnostic Failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={runDiagnostic} variant="outline" size="sm" className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Diagnostic
        </Button>
      </Alert>
    )
  }

  if (!diagnosticResult) {
    return null
  }

  const { stripe, products, nextSteps } = diagnosticResult

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stripe Sync Diagnostic</CardTitle>
            <CardDescription>Troubleshoot product box synchronization with Stripe</CardDescription>
          </div>
          <Button onClick={runDiagnostic} variant="outline" size="sm" className="border-zinc-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stripe Account Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Stripe Account Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Account ID</span>
                <code className="text-xs bg-zinc-700 px-2 py-1 rounded">{stripe.accountId}</code>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Can Accept Payments</span>
                {stripe.canAcceptPayments ? (
                  <Badge variant="outline" className="border-green-500 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-400">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">API Connection</span>
                {stripe.apiTest.success ? (
                  <Badge variant="outline" className="border-green-500 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-400">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <Button onClick={openStripeAccount} variant="outline" size="sm" className="w-full border-zinc-700">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
              </div>
            </div>

            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Requirements</h4>
              {stripe.accountStatus.requirements.past_due.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-red-400 mb-1">Past Due:</div>
                  <ul className="text-xs text-red-300 list-disc list-inside">
                    {stripe.accountStatus.requirements.past_due.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {stripe.accountStatus.requirements.currently_due.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-amber-400 mb-1">Currently Due:</div>
                  <ul className="text-xs text-amber-300 list-disc list-inside">
                    {stripe.accountStatus.requirements.currently_due.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {stripe.accountStatus.requirements.eventually_due.length > 0 && (
                <div>
                  <div className="text-xs text-blue-400 mb-1">Eventually Due:</div>
                  <ul className="text-xs text-blue-300 list-disc list-inside">
                    {stripe.accountStatus.requirements.eventually_due.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {stripe.accountStatus.requirements.past_due.length === 0 &&
                stripe.accountStatus.requirements.currently_due.length === 0 &&
                stripe.accountStatus.requirements.eventually_due.length === 0 && (
                  <div className="text-xs text-green-400">No pending requirements</div>
                )}
              <div className="mt-4">
                <Button onClick={openStripeOnboarding} variant="outline" size="sm" className="w-full border-zinc-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Complete Stripe Onboarding
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Sync Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Product Sync Status</h3>
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm">
                  {products.unsyncedCount} unsynced product{products.unsyncedCount !== 1 ? "s" : ""}
                </div>
                {products.unsyncedCount > 0 && (
                  <div className="text-xs text-zinc-400 mt-1">These products need to be synced with Stripe</div>
                )}
              </div>
              {products.unsyncedCount > 0 && (
                <Button
                  onClick={syncAllProducts}
                  disabled={!stripe.readyForSync || syncing}
                  className={
                    stripe.readyForSync
                      ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                      : "bg-zinc-700"
                  }
                  size="sm"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Sync All Products
                    </>
                  )}
                </Button>
              )}
            </div>

            {products.unsyncedCount > 0 && (
              <div className="space-y-2 mt-2">
                <div className="text-xs font-medium text-zinc-300">Unsynced Products:</div>
                <div className="max-h-40 overflow-y-auto">
                  {products.unsyncedBoxes.map((box) => (
                    <div key={box.id} className="flex items-center justify-between py-2 border-b border-zinc-700/50">
                      <div className="text-sm truncate max-w-[200px]">{box.title}</div>
                      <div className="text-sm">${box.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!stripe.readyForSync && products.unsyncedCount > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Blocked</AlertTitle>
                <AlertDescription>
                  {stripe.blockers.includes("charges_not_enabled") &&
                    "Your Stripe account cannot accept payments yet. Complete the onboarding process."}
                  {stripe.blockers.includes("api_connection_failed") &&
                    "Cannot connect to Stripe API. Check your account connection."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Recommended Actions</h3>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <ol className="list-decimal list-inside space-y-2">
                {nextSteps.map((step, i) => (
                  <li key={i} className="text-sm">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
