"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  ArrowLeft,
  Users,
  FolderSyncIcon as Sync,
  Plus,
  ExternalLink,
  Search,
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

interface ConnectedAccount {
  id: string
  type: string
  country: string
  email: string
  created: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
    disabled_reason?: string
  }
  capabilities: any
  metadata: any
  business_profile: any
}

interface StripeStatus {
  success: boolean
  connection_status: {
    is_connected: boolean
    has_test_connection: boolean
    has_live_connection: boolean
    primary_account_id: string | null
    mode: string
  }
  stored_data: {
    test_account_id: string | null
    live_account_id: string | null
    test_connected_flag: boolean
    live_connected_flag: boolean
  }
  stripe_verification: {
    test_account_exists_in_stripe: boolean
    live_account_exists_in_stripe: boolean
    total_platform_accounts: number
    user_accounts_found: number
  }
  account_details: ConnectedAccount | null
  all_user_accounts: ConnectedAccount[]
  debug_info: {
    user_id: string
    user_email: string
    stripe_key_prefix: string
    expected_platform_account: string
    total_accounts_in_stripe: number
  }
  message: string
}

interface AllConnectedAccounts {
  success: boolean
  total_accounts: number
  platform_accounts: number
  accounts: ConnectedAccount[]
  all_accounts_debug: any[]
  debug_info: any
}

interface VerifyAccountResult {
  success: boolean
  account_exists: boolean
  belongs_to_platform?: boolean
  account_details?: ConnectedAccount
  verification_checks?: {
    has_platform_metadata: boolean
    has_user_metadata: boolean
    email_matches: boolean
  }
}

export default function DebugStripeRealStatusPage() {
  const { user } = useAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [allAccounts, setAllAccounts] = useState<AllConnectedAccounts | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyAccountId, setVerifyAccountId] = useState("")
  const [verifyResult, setVerifyResult] = useState<VerifyAccountResult | null>(null)

  useEffect(() => {
    if (user) {
      loadStripeStatus()
      loadAllConnectedAccounts()
    }
  }, [user])

  const loadStripeStatus = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/status-from-stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus(data)
      } else {
        console.error("Failed to load Stripe status:", await response.text())
        toast({
          title: "Error",
          description: "Failed to load Stripe status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading Stripe status:", error)
      toast({
        title: "Error",
        description: "Failed to load Stripe status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAllConnectedAccounts = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/debug/stripe-connected-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAllAccounts(data)
      } else {
        console.error("Failed to load connected accounts:", await response.text())
      }
    } catch (error) {
      console.error("Error loading connected accounts:", error)
    }
  }

  const syncWithStripe = async () => {
    if (!user) return

    try {
      setSyncing(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/sync-with-stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Sync Complete",
          description: `Found ${data.sync_results.user_accounts_found} accounts in Stripe`,
        })
        await loadStripeStatus()
        await loadAllConnectedAccounts()
      } else {
        const errorData = await response.json()
        toast({
          title: "Sync Failed",
          description: errorData.error || "Failed to sync with Stripe",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing with Stripe:", error)
      toast({
        title: "Sync Error",
        description: "Failed to sync with Stripe",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const createTestAccount = async () => {
    if (!user) return

    try {
      setCreating(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/create-test-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email,
          country: "US",
          type: "express",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Test Account Created! 🎉",
          description: `Created account: ${data.account_id}`,
        })

        // Open onboarding URL in new tab
        if (data.onboarding_url) {
          window.open(data.onboarding_url, "_blank")
        }

        await loadStripeStatus()
        await loadAllConnectedAccounts()
      } else {
        const errorData = await response.json()
        toast({
          title: "Creation Failed",
          description: errorData.error || "Failed to create test account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating test account:", error)
      toast({
        title: "Creation Error",
        description: "Failed to create test account",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const verifyAccount = async () => {
    if (!user || !verifyAccountId.trim()) return

    try {
      setVerifying(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/verify-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_id: verifyAccountId.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setVerifyResult(data)

        if (data.account_exists) {
          toast({
            title: "Account Verified",
            description: `Account ${verifyAccountId} ${data.belongs_to_platform ? "belongs to your platform" : "exists but may not belong to you"}`,
          })
        } else {
          toast({
            title: "Account Not Found",
            description: `Account ${verifyAccountId} does not exist in Stripe`,
            variant: "destructive",
          })
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Verification Failed",
          description: errorData.error || "Failed to verify account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error verifying account:", error)
      toast({
        title: "Verification Error",
        description: "Failed to verify account",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-600 bg-red-600/10">
            <XCircle className="h-4 w-4" />
            <AlertDescription>Please log in to view Stripe connection status</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm" className="border-gray-600 bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Real Stripe Connection Status</h1>
            <p className="text-gray-400">Verified directly from Stripe's API - no database assumptions</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              onClick={syncWithStripe}
              disabled={syncing}
              variant="outline"
              className="border-gray-600 bg-transparent"
            >
              {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sync className="h-4 w-4 mr-2" />}
              Sync with Stripe
            </Button>
            <Button onClick={createTestAccount} disabled={creating} className="bg-blue-600 hover:bg-blue-700">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Test Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Connection Status */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">Your Connection Status</CardTitle>
              </div>
              <CardDescription>Real-time status from Stripe API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400">Loading from Stripe...</span>
                </div>
              ) : stripeStatus ? (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <Alert
                    className={
                      stripeStatus.connection_status.is_connected
                        ? "border-green-600 bg-green-600/10"
                        : "border-red-600 bg-red-600/10"
                    }
                  >
                    {getStatusIcon(stripeStatus.connection_status.is_connected)}
                    <AlertDescription>
                      <strong>Status:</strong> {stripeStatus.message}
                    </AlertDescription>
                  </Alert>

                  {/* Debug Info */}
                  {stripeStatus.debug_info && (
                    <div className="bg-gray-700/30 p-3 rounded-lg text-xs space-y-1">
                      <div className="text-gray-400 font-medium">Debug Information:</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-300">
                        <div>User ID: {stripeStatus.debug_info.user_id}</div>
                        <div>Email: {stripeStatus.debug_info.user_email}</div>
                        <div>Stripe Key: {stripeStatus.debug_info.stripe_key_prefix}</div>
                        <div>Expected Platform: {stripeStatus.debug_info.expected_platform_account}</div>
                        <div>Total in Stripe: {stripeStatus.debug_info.total_accounts_in_stripe}</div>
                      </div>
                    </div>
                  )}

                  {/* Connection Details */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Connection Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Test Connection:</span>
                        {getStatusIcon(stripeStatus.connection_status.has_test_connection)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Live Connection:</span>
                        {getStatusIcon(stripeStatus.connection_status.has_live_connection)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Primary Account:</span>
                        <span className="text-white font-mono text-xs">
                          {stripeStatus.connection_status.primary_account_id || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mode:</span>
                        <Badge variant={stripeStatus.connection_status.mode === "test" ? "default" : "destructive"}>
                          {stripeStatus.connection_status.mode}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Verification Status */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Stripe Verification</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Test Account in Stripe:</span>
                        {getStatusIcon(stripeStatus.stripe_verification.test_account_exists_in_stripe)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Live Account in Stripe:</span>
                        {getStatusIcon(stripeStatus.stripe_verification.live_account_exists_in_stripe)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Platform Accounts:</span>
                        <span className="text-white">{stripeStatus.stripe_verification.total_platform_accounts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Your Accounts Found:</span>
                        <span className="text-white">{stripeStatus.stripe_verification.user_accounts_found}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  {stripeStatus.account_details && (
                    <>
                      <Separator className="bg-gray-700" />
                      <div className="space-y-3">
                        <h4 className="text-white font-medium">Primary Account Details</h4>
                        <div className="bg-gray-700/30 p-3 rounded-lg space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Account ID:</span>
                            <span className="text-white font-mono">{stripeStatus.account_details.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Type:</span>
                            <Badge variant="outline">{stripeStatus.account_details.type}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-white">{stripeStatus.account_details.email}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="text-center p-2 bg-gray-600/30 rounded">
                              <div className="flex items-center justify-center mb-1">
                                {getStatusIcon(stripeStatus.account_details.charges_enabled)}
                              </div>
                              <div className="text-xs text-gray-400">Charges</div>
                            </div>
                            <div className="text-center p-2 bg-gray-600/30 rounded">
                              <div className="flex items-center justify-center mb-1">
                                {getStatusIcon(stripeStatus.account_details.payouts_enabled)}
                              </div>
                              <div className="text-xs text-gray-400">Payouts</div>
                            </div>
                            <div className="text-center p-2 bg-gray-600/30 rounded">
                              <div className="flex items-center justify-center mb-1">
                                {getStatusIcon(stripeStatus.account_details.details_submitted)}
                              </div>
                              <div className="text-xs text-gray-400">Details</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Failed to load Stripe status</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Account Verification Tool */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-white">Verify Account</CardTitle>
              </div>
              <CardDescription>Check if a specific account ID exists in Stripe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="acct_1RlAsqDBEjdom8Co"
                  value={verifyAccountId}
                  onChange={(e) => setVerifyAccountId(e.target.value)}
                  className="bg-gray-700/30 border-gray-600 text-white"
                />
                <Button
                  onClick={verifyAccount}
                  disabled={verifying || !verifyAccountId.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {verifying ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Verify Account
                </Button>
              </div>

              {verifyResult && (
                <div className="space-y-3">
                  <Separator className="bg-gray-700" />
                  <Alert
                    className={
                      verifyResult.account_exists ? "border-green-600 bg-green-600/10" : "border-red-600 bg-red-600/10"
                    }
                  >
                    {getStatusIcon(verifyResult.account_exists)}
                    <AlertDescription>
                      Account {verifyResult.account_exists ? "exists" : "not found"} in Stripe
                    </AlertDescription>
                  </Alert>

                  {verifyResult.account_exists && verifyResult.account_details && (
                    <div className="bg-gray-700/30 p-3 rounded-lg text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <Badge variant="outline">{verifyResult.account_details.type}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white text-xs">{verifyResult.account_details.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Belongs to Platform:</span>
                        {getStatusIcon(verifyResult.belongs_to_platform || false)}
                      </div>

                      {verifyResult.verification_checks && (
                        <div className="mt-3 pt-2 border-t border-gray-600">
                          <div className="text-xs text-gray-400 mb-2">Verification Checks:</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Platform Metadata:</span>
                              {getStatusIcon(verifyResult.verification_checks.has_platform_metadata)}
                            </div>
                            <div className="flex justify-between">
                              <span>User Metadata:</span>
                              {getStatusIcon(verifyResult.verification_checks.has_user_metadata)}
                            </div>
                            <div className="flex justify-between">
                              <span>Email Match:</span>
                              {getStatusIcon(verifyResult.verification_checks.email_matches)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Connected Accounts */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">All Platform Accounts</CardTitle>
            </div>
            <CardDescription>All accounts connected to MassClip platform</CardDescription>
          </CardHeader>
          <CardContent>
            {allAccounts ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-white font-medium">
                      Platform Accounts: {allAccounts.platform_accounts} / {allAccounts.total_accounts}
                    </div>
                    {allAccounts.debug_info && (
                      <div className="text-xs text-gray-400">
                        Stripe Key: {allAccounts.debug_info.stripe_context?.api_key_prefix} | Test Mode:{" "}
                        {allAccounts.debug_info.stripe_context?.test_mode ? "Yes" : "No"}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadAllConnectedAccounts}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {allAccounts.platform_accounts > 0 ? (
                  <ScrollArea className="h-96 w-full">
                    <div className="space-y-3">
                      {allAccounts.accounts.map((account, index) => (
                        <div key={account.id} className="p-3 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-mono text-sm">{account.id}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline">{account.type}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setVerifyAccountId(account.id)}
                                className="h-6 px-2"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>Email: {account.email || "Not provided"}</div>
                            <div>Country: {account.country}</div>
                            <div>Created: {new Date(account.created).toLocaleDateString()}</div>
                            <div className="flex gap-2 mt-2">
                              <Badge variant={account.charges_enabled ? "default" : "secondary"} className="text-xs">
                                Charges: {account.charges_enabled ? "✓" : "✗"}
                              </Badge>
                              <Badge variant={account.payouts_enabled ? "default" : "secondary"} className="text-xs">
                                Payouts: {account.payouts_enabled ? "✓" : "✗"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <Alert className="border-yellow-600 bg-yellow-600/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No platform accounts found in Stripe. Create a test account to get started.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Debug: All Accounts */}
                {allAccounts.all_accounts_debug && allAccounts.all_accounts_debug.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-gray-400 text-sm cursor-pointer hover:text-white">
                      Debug: All {allAccounts.total_accounts} accounts in Stripe
                    </summary>
                    <div className="mt-2 bg-gray-700/20 p-3 rounded text-xs">
                      <ScrollArea className="h-32">
                        {allAccounts.all_accounts_debug.map((account, index) => (
                          <div key={account.id} className="py-1 border-b border-gray-600/30 last:border-0">
                            <span className="font-mono">{account.id}</span> - {account.email} ({account.type})
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading accounts...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
