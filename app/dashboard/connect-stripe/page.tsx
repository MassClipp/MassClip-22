"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, Shield, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StripeAccountLinker from "@/components/stripe-account-linker"

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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [account, setAccount] = useState<StripeAccount | null>(null)
  const [balance, setBalance] = useState<StripeBalance | null>(null)
  const [transactions, setTransactions] = useState<StripeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      checkStripeConnection()
    }
  }, [user])

  const checkStripeConnection = async () => {
    try {
      setChecking(true)
      const response = await fetch("/api/stripe/connection-status")
      const data = await response.json()

      if (data.success && data.connected) {
        setIsConnected(true)
        // Redirect to earnings page if already connected
        router.push("/dashboard/earnings")
      }
    } catch (error) {
      console.error("Error checking Stripe connection:", error)
    } finally {
      setChecking(false)
    }
  }

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
      }
    } catch (error) {
      console.error("Error unlinking Stripe:", error)
    } finally {
      setUnlinking(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStripeData()
    setRefreshing(false)
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const getStatusBadge = (enabled: boolean, label: string) => {
    return (
      <div className="flex items-center gap-1" style={{ color: enabled ? "green" : "red" }}>
        {enabled ? "✓" : "✗"}
        {label}
      </div>
    )
  }

  const handleSuccess = () => {
    setIsConnected(true)
    // Redirect to earnings page after successful connection
    setTimeout(() => {
      router.push("/dashboard/earnings")
    }, 2000)
  }

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-white">Setting up your account...</p>
            <p className="text-sm text-zinc-400">Checking Stripe connection status</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Connect Your Stripe Account</h1>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Connect your Stripe account to start accepting payments and earning money from your content. This process
              is secure and takes just a few minutes.
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Secure & Reliable</CardTitle>
                <CardDescription className="text-zinc-400">Bank-level security and encryption</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>SSL encrypted connections</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>PCI DSS compliant</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Trusted by millions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Linking Component */}
        {!isConnected ? (
          <StripeAccountLinker onSuccess={handleSuccess} />
        ) : (
          <>
            {/* Account Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{"✓"} Stripe Account Connected</CardTitle>
                    <CardDescription>Your payment processing is active</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="bg-transparent border border-zinc-800/50 text-white px-4 py-2 rounded"
                      onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                    >
                      Stripe Dashboard
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded"
                      onClick={handleUnlinkStripe}
                      disabled={unlinking}
                    >
                      {unlinking ? "Unlinking..." : "Unlink"}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Account Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                    <p className="font-mono text-sm">{account?.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{account?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p className="text-sm">{account?.country}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-sm capitalize">{account?.type}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-800/50 mt-4" />

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(account?.charges_enabled || false, "Charges")}
                  {getStatusBadge(account?.payouts_enabled || false, "Payouts")}
                  {getStatusBadge(account?.details_submitted || false, "Details")}
                  <div
                    className="flex items-center gap-1"
                    style={{ color: process.env.NODE_ENV === "production" ? "green" : "red" }}
                  >
                    {process.env.NODE_ENV === "production" ? "✓" : "✗"}
                    {process.env.NODE_ENV === "production" ? "Live" : "Test"} Mode
                  </div>
                </div>

                {/* Requirements */}
                {account?.requirements.currently_due.length > 0 && (
                  <div className="bg-red-600 text-white px-4 py-2 rounded mt-4">
                    <strong>Action Required:</strong> You have {account.requirements.currently_due.length}
                    requirement(s) that need to be completed to maintain full account functionality.
                  </div>
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
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                <CardTitle className="flex items-center gap-2">{"✓"} Recent Transactions</CardTitle>
                <CardDescription>Your latest payment activity</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-12 h-12 mx-auto mb-4 opacity-50">{"✓"}</div>
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
                            <div className="bg-green-600 text-white px-2 py-1 rounded">{transaction.status}</div>
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
    </div>
  )
}
