"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  Unlink,
  LinkIcon,
  RefreshCw,
  Info,
  Building,
  Globe,
  Mail,
  Shield,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface StripeAccountStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirementsCount: number
  currentlyDue: string[]
  pastDue: string[]
  email?: string
  country?: string
  type?: string
  livemode?: boolean
}

interface StripeBalance {
  available: Array<{ amount: number; currency: string }>
  pending: Array<{ amount: number; currency: string }>
}

interface StripeTransaction {
  id: string
  amount: number
  currency: string
  description: string
  created: number
  status: string
  type: string
}

export default function ConnectStripePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null)
  const [balance, setBalance] = useState<StripeBalance | null>(null)
  const [transactions, setTransactions] = useState<StripeTransaction[]>([])
  const [unlinking, setUnlinking] = useState(false)

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    if (!user) return

    setChecking(true)
    try {
      const token = await user.getIdToken()

      // Check connection status
      const statusResponse = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      })

      const statusData = await statusResponse.json()

      if (statusData.success && statusData.isConnected) {
        setAccountStatus({
          connected: true,
          accountId: statusData.accountId,
          chargesEnabled: statusData.accountStatus?.chargesEnabled || false,
          payoutsEnabled: statusData.accountStatus?.payoutsEnabled || false,
          detailsSubmitted: statusData.accountStatus?.detailsSubmitted || false,
          requirementsCount: statusData.accountStatus?.requirementsCount || 0,
          currentlyDue: statusData.accountStatus?.currentlyDue || [],
          pastDue: statusData.accountStatus?.pastDue || [],
          email: statusData.accountStatus?.email,
          country: statusData.accountStatus?.country,
          type: statusData.accountStatus?.type,
          livemode: statusData.accountStatus?.livemode,
        })

        // Fetch balance and transactions if connected
        await Promise.all([fetchBalance(token), fetchTransactions(token)])
      } else {
        setAccountStatus({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          requirementsCount: 0,
          currentlyDue: [],
          pastDue: [],
        })
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
      toast({
        title: "Error",
        description: "Failed to check Stripe account status",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  const fetchBalance = async (token: string) => {
    try {
      const response = await fetch("/api/stripe/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      })

      if (response.ok) {
        const data = await response.json()
        setBalance(data.balance)
      }
    } catch (error) {
      console.error("Error fetching balance:", error)
    }
  }

  const fetchTransactions = async (token: string) => {
    try {
      const response = await fetch("/api/stripe/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token, limit: 10 }),
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  const connectStripeAccount = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      })

      const data = await response.json()

      if (data.onboardingComplete) {
        toast({
          title: "Success",
          description: "Stripe account already connected!",
        })
        await checkStripeStatus()
      } else if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to connect Stripe account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Stripe",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const unlinkStripeAccount = async () => {
    if (!user || !accountStatus?.accountId) return

    setUnlinking(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          accountId: accountStatus.accountId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Account Unlinked",
          description: "Your Stripe account has been successfully unlinked.",
        })
        await checkStripeStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to unlink Stripe account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink Stripe account",
        variant: "destructive",
      })
    } finally {
      setUnlinking(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking Stripe account status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Integration</h1>
          <p className="text-zinc-400 mt-1">Manage your payment processing and view account details</p>
        </div>
        <Button variant="outline" onClick={checkStripeStatus} disabled={checking}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Connection Status Overview */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Account Status
          </CardTitle>
          <CardDescription>Current status of your Stripe integration</CardDescription>
        </CardHeader>
        <CardContent>
          {!accountStatus?.connected ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Stripe Account Connected</h3>
              <p className="text-zinc-400 mb-6">
                Connect your Stripe account to start accepting payments and receiving payouts.
              </p>
              <Button onClick={connectStripeAccount} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Stripe Account
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.chargesEnabled ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Charges</div>
                  <div className="text-xs text-zinc-400">{accountStatus.chargesEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                <div className="text-center p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.payoutsEnabled ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Payouts</div>
                  <div className="text-xs text-zinc-400">{accountStatus.payoutsEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                <div className="text-center p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.detailsSubmitted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Details</div>
                  <div className="text-xs text-zinc-400">{accountStatus.detailsSubmitted ? "Complete" : "Pending"}</div>
                </div>

                <div className="text-center p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.requirementsCount === 0 ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Requirements</div>
                  <div className="text-xs text-zinc-400">
                    {accountStatus.requirementsCount === 0 ? "Complete" : `${accountStatus.requirementsCount} pending`}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium">Account ID:</span>
                    <code className="text-xs bg-zinc-800 px-2 py-1 rounded">{accountStatus.accountId}</code>
                  </div>

                  {accountStatus.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm text-zinc-400">{accountStatus.email}</span>
                    </div>
                  )}

                  {accountStatus.country && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium">Country:</span>
                      <span className="text-sm text-zinc-400">{accountStatus.country}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {accountStatus.type && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium">Account Type:</span>
                      <Badge variant="outline">{accountStatus.type}</Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium">Mode:</span>
                    <Badge variant={accountStatus.livemode ? "default" : "secondary"}>
                      {accountStatus.livemode ? "Live" : "Test"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Requirements Alert */}
              {accountStatus.requirementsCount > 0 && (
                <Alert className="border-yellow-600 bg-yellow-600/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">
                        Your account needs additional information to enable full functionality.
                      </div>
                      {accountStatus.currentlyDue.length > 0 && (
                        <div>
                          <div className="text-sm font-medium">Currently Due:</div>
                          <ul className="list-disc list-inside text-sm ml-4">
                            {accountStatus.currentlyDue.map((req, index) => (
                              <li key={index}>{req.replace(/_/g, " ")}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.open("https://dashboard.stripe.com", "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe Dashboard
                </Button>

                <Button variant="destructive" onClick={unlinkStripeAccount} disabled={unlinking}>
                  {unlinking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unlinking...
                    </>
                  ) : (
                    <>
                      <Unlink className="h-4 w-4 mr-2" />
                      Unlink Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance and Transactions - Only show if connected */}
      {accountStatus?.connected && (
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="balance">Account Balance</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="balance">
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Account Balance
                </CardTitle>
                <CardDescription>Your current Stripe account balance</CardDescription>
              </CardHeader>
              <CardContent>
                {balance ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Available Balance</h3>
                        {balance.available.length > 0 ? (
                          balance.available.map((bal, index) => (
                            <div key={index} className="text-2xl font-bold text-green-500">
                              {formatCurrency(bal.amount, bal.currency)}
                            </div>
                          ))
                        ) : (
                          <div className="text-2xl font-bold text-zinc-400">$0.00</div>
                        )}
                        <p className="text-sm text-zinc-400">Ready for payout</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Pending Balance</h3>
                        {balance.pending.length > 0 ? (
                          balance.pending.map((bal, index) => (
                            <div key={index} className="text-2xl font-bold text-yellow-500">
                              {formatCurrency(bal.amount, bal.currency)}
                            </div>
                          ))
                        ) : (
                          <div className="text-2xl font-bold text-zinc-400">$0.00</div>
                        )}
                        <p className="text-sm text-zinc-400">Processing or on hold</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Loading balance information...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Your latest Stripe transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{transaction.description || "Payment"}</span>
                            <Badge variant={transaction.status === "succeeded" ? "default" : "secondary"}>
                              {transaction.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span>{transaction.type}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(transaction.created)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          <div className="text-xs text-zinc-400">{transaction.currency.toUpperCase()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                    <p className="text-zinc-400">
                      Your recent transactions will appear here once you start processing payments.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Test Mode Notice */}
      <Alert className="border-blue-600 bg-blue-600/10">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Environment:</strong> This application is currently running in test mode. All transactions are
          simulated and no real money will be processed.
        </AlertDescription>
      </Alert>
    </div>
  )
}
