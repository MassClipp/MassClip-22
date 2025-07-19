"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CreditCard,
  DollarSign,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Unlink,
  LinkIcon,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StripeAccount {
  id: string
  email: string
  country: string
  type: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
}

interface StripeBalance {
  available: Array<{ amount: number; currency: string }>
  pending: Array<{ amount: number; currency: string }>
}

interface StripeTransaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  created: number
  type: string
}

export default function ConnectStripePage() {
  const [account, setAccount] = useState<StripeAccount | null>(null)
  const [balance, setBalance] = useState<StripeBalance | null>(null)
  const [transactions, setTransactions] = useState<StripeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchStripeData()
  }, [])

  const fetchStripeData = async () => {
    try {
      setLoading(true)

      // Fetch account status
      const accountResponse = await fetch("/api/stripe/connect/status")
      if (accountResponse.ok) {
        const accountData = await accountResponse.json()
        setAccount(accountData.account)

        if (accountData.account) {
          // Fetch balance
          const balanceResponse = await fetch("/api/stripe/balance")
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            setBalance(balanceData.balance)
          }

          // Fetch recent transactions
          const transactionsResponse = await fetch("/api/stripe/transactions")
          if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json()
            setTransactions(transactionsData.transactions || [])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching Stripe data:", error)
      toast({
        title: "Error",
        description: "Failed to load Stripe account information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      setConnecting(true)
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      } else {
        throw new Error("Failed to create onboarding link")
      }
    } catch (error) {
      console.error("Error connecting Stripe:", error)
      toast({
        title: "Error",
        description: "Failed to connect Stripe account",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleUnlinkStripe = async () => {
    if (!confirm("Are you sure you want to unlink your Stripe account? This will disable payments.")) {
      return
    }

    try {
      setUnlinking(true)
      const response = await fetch("/api/stripe/connect/unlink", {
        method: "POST",
      })

      if (response.ok) {
        setAccount(null)
        setBalance(null)
        setTransactions([])
        toast({
          title: "Success",
          description: "Stripe account has been unlinked",
        })
      } else {
        throw new Error("Failed to unlink account")
      }
    } catch (error) {
      console.error("Error unlinking Stripe:", error)
      toast({
        title: "Error",
        description: "Failed to unlink Stripe account",
        variant: "destructive",
      })
    } finally {
      setUnlinking(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStripeData()
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Account information has been updated",
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const getStatusBadge = (enabled: boolean, label: string) => {
    return (
      <Badge variant={enabled ? "default" : "destructive"} className="flex items-center gap-1">
        {enabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading Stripe account information...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Integration</h1>
          <p className="text-muted-foreground">Manage your payment processing and view account information</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-transparent"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!account ? (
        /* No Account Connected */
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Connect Your Stripe Account</CardTitle>
            <CardDescription>
              Connect your Stripe account to start receiving payments for your premium content
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleConnectStripe} disabled={connecting} size="lg" className="flex items-center gap-2">
              {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
              {connecting ? "Connecting..." : "Connect Stripe Account"}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              You'll be redirected to Stripe to complete the setup process
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Account Connected */
        <>
          {/* Account Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Stripe Account Connected
                  </CardTitle>
                  <CardDescription>Your payment processing is active</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleUnlinkStripe} disabled={unlinking}>
                    {unlinking ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Unlink className="w-4 h-4 mr-2" />
                    )}
                    Unlink
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                  <p className="font-mono text-sm">{account.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{account.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Country</p>
                  <p className="text-sm">{account.country}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm capitalize">{account.type}</p>
                </div>
              </div>

              <Separator />

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(account.charges_enabled, "Charges")}
                {getStatusBadge(account.payouts_enabled, "Payouts")}
                {getStatusBadge(account.details_submitted, "Details")}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {process.env.NODE_ENV === "production" ? "Live" : "Test"} Mode
                </Badge>
              </div>

              {/* Requirements */}
              {account.requirements.currently_due.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Action Required:</strong> You have {account.requirements.currently_due.length}
                    requirement(s) that need to be completed to maintain full account functionality.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Balance Information */}
          {balance && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {balance.available.length > 0
                      ? formatCurrency(balance.available[0].amount, balance.available[0].currency)
                      : "$0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">Ready for payout</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {balance.pending.length > 0
                      ? formatCurrency(balance.pending[0].amount, balance.pending[0].currency)
                      : "$0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">Processing or on hold</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your latest payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Transactions will appear here once you start receiving payments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{transaction.description || "Payment"}</p>
                          <Badge variant={transaction.status === "succeeded" ? "default" : "secondary"}>
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created * 1000).toLocaleDateString()} • {transaction.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(transaction.amount, transaction.currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
