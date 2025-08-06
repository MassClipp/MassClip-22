"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle, Bug, Info, Loader2, ExternalLink, Globe, Shield } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

// Safe formatting functions
function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatNumber(value: number): string {
  if (typeof value !== "number" || isNaN(value)) return "0"
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercentage(value: number): string {
  if (typeof value !== "number" || isNaN(value)) return "0%"
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function formatDateTime(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return "Invalid Date"
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "Invalid Date"
  }
}

function calculatePercentageChange(current: number, previous: number): number {
  if (typeof current !== "number" || typeof previous !== "number") return 0
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
}

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
    conversionRate: number
  }
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
    currentlyDue: string[]
    pastDue: string[]
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: any[]
  error?: string
  isDemo?: boolean
  message?: string
  stripeAccountId?: string
  lastUpdated?: string
  debug?: any
  demoData?: any
}

export default function EarningsPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus | null>(null)
  const [checkingStripe, setCheckingStripe] = useState(true)
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  // Check Stripe connection status
  const checkStripeStatus = async () => {
    if (!user?.uid) return

    try {
      setCheckingStripe(true)
      console.log("🔍 Checking Stripe connection status...")

      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 Stripe status:", data)
        setStripeStatus(data)
        
        // Only fetch earnings if Stripe is properly connected
        if (data.connected && data.chargesEnabled && data.detailsSubmitted) {
          await fetchEarningsData()
        } else {
          setLoading(false)
        }
      } else {
        console.log("🔍 No Stripe connection found")
        setStripeStatus({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: "not_connected"
        })
        setLoading(false)
      }
    } catch (error) {
      console.error("🔍 Error checking Stripe status:", error)
      setStripeStatus({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "error"
      })
      setLoading(false)
    } finally {
      setCheckingStripe(false)
    }
  }

  const fetchEarningsData = async (forceRefresh = false) => {
    try {
      setError(null)
      setDebugInfo(null)
      
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      console.log("🔍 Fetching earnings data...")

      const endpoint = "/api/dashboard/earnings"
      const method = forceRefresh ? "POST" : "GET"

      console.log(`🔍 Making ${method} request to ${endpoint}`)

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`🔍 Response status: ${response.status}`)
      console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log(`🔍 Raw response:`, responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("🔍 JSON parse error:", parseError)
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`)
      }

      console.log("🔍 Parsed response data:", data)

      // Store debug information
      if (data.debug) {
        setDebugInfo(data.debug)
        console.log("🔍 Debug info received:", data.debug)
      }

      if (!response.ok) {
        console.error("🔍 API Error - Status:", response.status)
        console.error("🔍 API Error - Data:", data)
        
        // If we have demo data in the error response, use it
        if (data.demoData) {
          setEarningsData({
            ...data.demoData,
            isDemo: true,
            error: data.error,
            message: data.message,
            debug: data.debug,
            lastUpdated: data.lastUpdated,
          })
          return
        }
        
        throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`)
      }

      setEarningsData(data)
      console.log("🔍 Earnings data set successfully")
    } catch (err) {
      console.error("🔍 Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to load earnings data")
      
      // Set fallback demo data
      setEarningsData({
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        last30DaysEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        salesMetrics: {
          totalSales: 0,
          thisMonthSales: 0,
          last30DaysSales: 0,
          averageTransactionValue: 0,
          conversionRate: 0,
        },
        accountStatus: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          requirementsCount: 0,
          currentlyDue: [],
          pastDue: [],
        },
        recentTransactions: [],
        payoutHistory: [],
        monthlyBreakdown: [],
        isDemo: true,
        error: err instanceof Error ? err.message : "Unknown error",
        lastUpdated: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const handleRefresh = () => {
    if (stripeStatus?.connected && stripeStatus?.chargesEnabled && stripeStatus?.detailsSubmitted) {
      fetchEarningsData(true)
    } else {
      checkStripeStatus()
    }
  }

  // Show loading while checking auth or Stripe status
  if (authLoading || checkingStripe) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">
            {authLoading ? "Loading..." : "Checking Stripe connection..."}
          </p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show Stripe connection setup if not connected or not fully set up
  if (!stripeStatus?.connected || !stripeStatus?.chargesEnabled || !stripeStatus?.detailsSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light pointer-events-none"></div>
        <div className="relative z-10 container mx-auto py-16 px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/20">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Connect Your Stripe Account
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Start accepting payments and track your earnings with our integrated payment solution
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30 ring-4 ring-green-500/20 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">$</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-white">Accept Payments</h3>
              <p className="text-gray-300 leading-relaxed">Process payments from customers worldwide with enterprise-grade security</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-white">Global Reach</h3>
              <p className="text-gray-300 leading-relaxed">Supported in 40+ countries with local payment methods and currencies</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30 ring-4 ring-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-white">Secure & Reliable</h3>
              <p className="text-gray-300 leading-relaxed">Bank-level security with PCI compliance and fraud protection</p>
            </div>
          </div>

          {/* Connection Options */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {/* Create New Account */}
            <Card className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 border-gray-600/50 shadow-2xl backdrop-blur-sm hover:shadow-blue-500/20 transition-all duration-300 group">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-blue-300 transition-colors">
                    Create New Stripe Account
                  </CardTitle>
                </div>
                <CardDescription className="text-gray-300 text-base leading-relaxed">
                  Set up a new Stripe account to start accepting payments instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-lg">Quick 5-minute setup</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-lg">2.9% + 30¢ per transaction</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-lg">Automatic payouts to your bank</span>
                  </div>
                </div>
                
                <Button 
                  onClick={async () => {
                    try {
                      setError(null)
                      const response = await fetch("/api/stripe/create-stripe-account", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid }),
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || "Failed to create Stripe account")
                      if (data.url) window.location.href = data.url
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to create account")
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 text-lg py-6"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-3 h-6 w-6" />
                      Create Stripe Account
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  You'll be redirected to Stripe to complete the secure setup process
                </p>
              </CardContent>
            </Card>

            {/* Connect Existing Account */}
            <Card className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 border-gray-600/50 shadow-2xl backdrop-blur-sm hover:shadow-green-500/20 transition-all duration-300 group">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <ExternalLink className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-green-300 transition-colors">
                    Already Have a Stripe Account?
                  </CardTitle>
                </div>
                <CardDescription className="text-gray-300 text-base leading-relaxed">
                  Securely connect your existing Stripe account through Stripe Connect
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-lg">Secure OAuth connection</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-lg">No manual account IDs needed</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-lg">Stripe handles account verification</span>
                  </div>
                </div>
                
                <Button 
                  onClick={async () => {
                    try {
                      setError(null)
                      const response = await fetch("/api/stripe/connect/oauth", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid }),
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || "Failed to connect Stripe account")
                      if (data.authUrl) window.location.href = data.authUrl
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to connect account")
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 text-white shadow-xl hover:shadow-2xl hover:shadow-green-500/30 transition-all duration-300 text-lg py-6"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-3 h-6 w-6" />
                      Connect with Stripe
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  Stripe will detect your existing account and connect it securely
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mt-12 max-w-2xl mx-auto border-red-500/50 bg-red-900/20 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 text-red-300">
                  <AlertCircle className="h-6 w-6 flex-shrink-0" />
                  <span className="text-lg">Error: {error}</span>
                </div>
                <Button 
                  onClick={() => setError(null)} 
                  variant="outline" 
                  size="sm" 
                  className="mt-6 border-red-500/50 text-red-300 hover:bg-red-900/40 hover:border-red-400"
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          {/* How It Works Section */}
          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold mb-12 flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
                <span className="text-lg font-bold text-white">?</span>
              </div>
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Choose Your Option</h3>
                <p className="text-gray-300 leading-relaxed">Create a new account or connect an existing one with just a few clicks</p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Complete Setup</h3>
                <p className="text-gray-300 leading-relaxed">Follow Stripe's secure onboarding process to verify your account</p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Start Earning</h3>
                <p className="text-gray-300 leading-relaxed">Begin accepting payments and tracking your earnings immediately</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while fetching earnings data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
              <p className="text-gray-400">Track your revenue and performance</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-700 animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const data = earningsData!

  // After the data assignment, add safety checks
  const safeData = {
    totalEarnings: data?.totalEarnings || 0,
    thisMonthEarnings: data?.thisMonthEarnings || 0,
    lastMonthEarnings: data?.lastMonthEarnings || 0,
    last30DaysEarnings: data?.last30DaysEarnings || 0,
    pendingPayout: data?.pendingPayout || 0,
    availableBalance: data?.availableBalance || 0,
    salesMetrics: {
      totalSales: data?.salesMetrics?.totalSales || 0,
      thisMonthSales: data?.salesMetrics?.thisMonthSales || 0,
      last30DaysSales: data?.salesMetrics?.last30DaysSales || 0,
      averageTransactionValue: data?.salesMetrics?.averageTransactionValue || 0,
      conversionRate: data?.salesMetrics?.conversionRate || 0,
    },
    accountStatus: {
      chargesEnabled: data?.accountStatus?.chargesEnabled || false,
      payoutsEnabled: data?.accountStatus?.payoutsEnabled || false,
      detailsSubmitted: data?.accountStatus?.detailsSubmitted || false,
      requirementsCount: data?.accountStatus?.requirementsCount || 0,
      currentlyDue: data?.accountStatus?.currentlyDue || [],
      pastDue: data?.accountStatus?.pastDue || [],
    },
    recentTransactions: data?.recentTransactions || [],
    payoutHistory: data?.payoutHistory || [],
    monthlyBreakdown: data?.monthlyBreakdown || [],
    error: data?.error,
    isDemo: data?.isDemo,
    message: data?.message,
    stripeAccountId: data?.stripeAccountId,
    lastUpdated: data?.lastUpdated,
    debug: data?.debug,
  }

  const monthlyGrowth = calculatePercentageChange(safeData.thisMonthEarnings, safeData.lastMonthEarnings)

  // Determine data source badge
  const getDataSourceBadge = () => {
    if (safeData.error) {
      return <Badge variant="destructive">Error</Badge>
    }
    if (safeData.isDemo) {
      return <Badge variant="secondary">Demo Data</Badge>
    }
    return <Badge variant="default">Live Data</Badge>
  }

  // Account status badge
  const getAccountStatusBadge = () => {
    const { accountStatus } = safeData
    if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
      return <Badge variant="destructive">Setup Required</Badge>
    }
    if (accountStatus.requirementsCount > 0) {
      return <Badge variant="secondary">Action Required</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
            <p className="text-gray-400">Track your revenue and performance</p>
            <div className="flex items-center gap-2 mt-2">
              {getDataSourceBadge()}
              {safeData.stripeAccountId && <Badge variant="outline">Account: {safeData.stripeAccountId.slice(-6)}</Badge>}
              {safeData.message && <Badge variant="outline">{safeData.message}</Badge>}
              {debugInfo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                  className="ml-2"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Debug Info
                </Button>
              )}
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Debug Information Panel */}
        {debugInfo && showDebug && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debugInfo.logs && (
                  <div>
                    <h4 className="font-semibold mb-2">Execution Log:</h4>
                    <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-60 overflow-y-auto">
                      {debugInfo.logs.map((log: any, index: number) => (
                        <div key={index} className="mb-1">
                          <span className="text-blue-600">[{log.step}]</span> {log.action}
                          {log.timestamp && <span className="text-gray-500 ml-2">({new Date(log.timestamp).toLocaleTimeString()})</span>}
                          {log.error && <span className="text-red-600 ml-2">ERROR: {log.error}</span>}
                          {log.data && (
                            <pre className="ml-4 text-xs text-gray-600">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {debugInfo.importErrors && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Import Errors:</h4>
                    <div className="bg-red-50 p-3 rounded">
                      {debugInfo.importErrors.map((error: string, index: number) => (
                        <div key={index} className="text-red-700 text-sm">{error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {debugInfo.importStatus && (
                  <div>
                    <h4 className="font-semibold mb-2">Import Status:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(debugInfo.importStatus).map(([key, status]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span className={status === "✅ success" ? "text-green-600" : "text-red-600"}>
                            {status as string}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {debugInfo.errorDetails && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Error Details:</h4>
                    <div className="bg-red-50 p-3 rounded text-sm">
                      <div><strong>Name:</strong> {debugInfo.errorDetails.name}</div>
                      <div><strong>Message:</strong> {debugInfo.errorDetails.message}</div>
                      {debugInfo.errorDetails.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer">Stack Trace</summary>
                          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                            {debugInfo.errorDetails.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {debugInfo.environment && (
                  <div>
                    <h4 className="font-semibold mb-2">Environment:</h4>
                    <div className="text-sm">
                      <div>Node Version: {debugInfo.environment.nodeVersion}</div>
                      <div>Platform: {debugInfo.environment.platform}</div>
                      <div>Timestamp: {debugInfo.environment.timestamp}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
              <Button onClick={() => fetchEarningsData()} className="mt-4" variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeData.totalEarnings)}</div>
              <p className="text-xs text-gray-400">All-time revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeData.thisMonthEarnings)}</div>
              <p className="text-xs text-gray-400">{formatPercentage(monthlyGrowth)} from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Available Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeData.availableBalance)}</div>
              <p className="text-xs text-gray-400">Ready for payout</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Sales</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(safeData.salesMetrics.totalSales)}</div>
              <p className="text-xs text-gray-400">
                {formatCurrency(safeData.salesMetrics.averageTransactionValue)} avg order
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Mode Notice */}
        {safeData.isDemo && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-800">Demo Mode Active</h3>
                  <p className="text-sm text-blue-700">
                    This is sample data for demonstration purposes. Connect your Stripe account to see real earnings.
                  </p>
                  {safeData.error && (
                    <p className="text-sm text-blue-600 mt-1">
                      Reason: {safeData.error}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Status Alert */}
        {safeData.accountStatus.requirementsCount > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Account Setup Required</h3>
                  <p className="text-sm text-yellow-700">
                    {safeData.accountStatus.requirementsCount} requirement(s) need attention to enable full functionality.
                  </p>
                  {safeData.accountStatus.currentlyDue.length > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Currently due: {safeData.accountStatus.currentlyDue.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="text-gray-300 data-[state=active]:text-white">Transactions</TabsTrigger>
            <TabsTrigger value="analytics" className="text-gray-300 data-[state=active]:text-white">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Last 30 Days</span>
                    <span className="font-semibold text-white">{formatCurrency(safeData.last30DaysEarnings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">This Month Sales</span>
                    <span className="font-semibold text-white">{formatNumber(safeData.salesMetrics.thisMonthSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Last 30 Days Sales</span>
                    <span className="font-semibold text-white">{formatNumber(safeData.salesMetrics.last30DaysSales)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Payout Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Pending Payout</span>
                    <span className="font-semibold text-white">{formatCurrency(safeData.pendingPayout)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Available Balance</span>
                    <span className="font-semibold text-green-400">{formatCurrency(safeData.availableBalance)}</span>
                  </div>
                  <Separator className="bg-gray-600" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Account Status</span>
                    {getAccountStatusBadge()}
                  </div>
                  <Button className="w-full bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700" variant="outline">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Payouts
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Transactions</CardTitle>
                <CardDescription className="text-gray-400">Your latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {safeData.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {safeData.recentTransactions.slice(0, 10).map((transaction, index) => (
                      <div
                        key={transaction.id || index}
                        className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-700/50"
                      >
                        <div>
                          <p className="font-medium text-white">{transaction.description}</p>
                          <p className="text-sm text-gray-400">
                            {formatDateTime(transaction.created)} • {transaction.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatCurrency(transaction.net)}</p>
                          <p className="text-sm text-gray-400">
                            {transaction.status === "available" ? (
                              <CheckCircle className="inline h-3 w-3 text-green-500 mr-1" />
                            ) : (
                              <AlertCircle className="inline h-3 w-3 text-yellow-500 mr-1" />
                            )}
                            {transaction.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">No transactions found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Health</CardTitle>
                <CardDescription className="text-gray-400">Your Stripe account status and capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Charges Enabled</span>
                    {safeData.accountStatus.chargesEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Payouts Enabled</span>
                    {safeData.accountStatus.payoutsEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Details Submitted</span>
                    {safeData.accountStatus.detailsSubmitted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Requirements</span>
                    <Badge variant={safeData.accountStatus.requirementsCount > 0 ? "destructive" : "default"}>
                      {safeData.accountStatus.requirementsCount} pending
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        {safeData.lastUpdated && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Last updated: {formatDateTime(safeData.lastUpdated)}
          </div>
        )}
      </div>
    </div>
  )
}
