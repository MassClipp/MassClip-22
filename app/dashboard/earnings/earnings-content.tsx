'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Calendar, CreditCard, AlertCircle, CheckCircle, ExternalLink, RefreshCw, Download } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'

interface EarningsData {
  totalEarnings: number
  monthlyEarnings: number
  pendingPayouts: number
  completedPayouts: number
  recentTransactions: Array<{
    id: string
    amount: number
    currency: string
    status: string
    created: number
    description: string
  }>
  stripeAccountStatus?: {
    connected: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    requirements?: string[]
  }
}

export function EarningsContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for onboarding success
  useEffect(() => {
    const onboarding = searchParams.get('onboarding')
    if (onboarding === 'success') {
      toast({
        title: "Stripe Account Connected!",
        description: "Your Stripe account has been successfully connected. You can now start receiving payments.",
        duration: 5000,
      })
    }
  }, [searchParams, toast])

  // Fetch earnings data
  const fetchEarnings = async () => {
    if (!user) return

    try {
      setError(null)
      const response = await fetch('/api/dashboard/earnings', {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch earnings data')
      }

      const data = await response.json()
      
      // Ensure stripeAccountStatus has default values
      const processedData: EarningsData = {
        totalEarnings: data.totalEarnings || 0,
        monthlyEarnings: data.monthlyEarnings || 0,
        pendingPayouts: data.pendingPayouts || 0,
        completedPayouts: data.completedPayouts || 0,
        recentTransactions: data.recentTransactions || [],
        stripeAccountStatus: {
          connected: data.stripeAccountStatus?.connected || false,
          charges_enabled: data.stripeAccountStatus?.charges_enabled || false,
          payouts_enabled: data.stripeAccountStatus?.payouts_enabled || false,
          details_submitted: data.stripeAccountStatus?.details_submitted || false,
          requirements: data.stripeAccountStatus?.requirements || []
        }
      }
      
      setEarnings(processedData)
    } catch (error: any) {
      console.error('Error fetching earnings:', error)
      setError(error.message || 'Failed to load earnings data')
      
      // Set default earnings data on error
      setEarnings({
        totalEarnings: 0,
        monthlyEarnings: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        recentTransactions: [],
        stripeAccountStatus: {
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  // Refresh account status
  const refreshAccountStatus = async () => {
    if (!user) return

    try {
      setRefreshing(true)
      const response = await fetch('/api/stripe/connect/refresh-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      })

      if (response.ok) {
        await fetchEarnings()
        toast({
          title: "Account Status Updated",
          description: "Your Stripe account status has been refreshed.",
        })
      }
    } catch (error) {
      console.error('Error refreshing account status:', error)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh account status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [user])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-96 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-zinc-900/60 border-zinc-800/50">
                <CardContent className="p-6">
                  <div className="h-16 bg-zinc-800 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !earnings) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert className="border-red-600 bg-red-600/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            {error}
            <Button
              onClick={fetchEarnings}
              variant="link"
              className="p-0 h-auto ml-2 text-red-200 underline"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Use default values if earnings is still null
  const safeEarnings = earnings || {
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    recentTransactions: [],
    stripeAccountStatus: {
      connected: false,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements: []
    }
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100) // Stripe amounts are in cents
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Earnings Dashboard</h1>
            <p className="text-zinc-400">Track your revenue and manage payouts</p>
          </div>
          <Button
            onClick={refreshAccountStatus}
            disabled={refreshing}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-amber-600 bg-amber-600/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-200">
              {error} - Showing cached data.
            </AlertDescription>
          </Alert>
        )}

        {/* Stripe Account Status */}
        {!safeEarnings.stripeAccountStatus?.connected && (
          <Alert className="border-amber-600 bg-amber-600/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-200">
              <div className="flex items-center justify-between">
                <span>Connect your Stripe account to start receiving payments</span>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => window.location.href = '/dashboard/connect-stripe'}
                >
                  Connect Stripe
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {safeEarnings.stripeAccountStatus?.connected && !safeEarnings.stripeAccountStatus?.details_submitted && (
          <Alert className="border-blue-600 bg-blue-600/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-blue-200">
              <div className="flex items-center justify-between">
                <span>Complete your Stripe account setup to enable payouts</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-600 text-blue-300 hover:bg-blue-900/20"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(safeEarnings.totalEarnings)}
              </div>
              <p className="text-xs text-zinc-500">All time revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(safeEarnings.monthlyEarnings)}
              </div>
              <p className="text-xs text-zinc-500">Current month</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Pending Payouts</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(safeEarnings.pendingPayouts)}
              </div>
              <p className="text-xs text-zinc-500">Processing</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Completed Payouts</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(safeEarnings.completedPayouts)}
              </div>
              <p className="text-xs text-zinc-500">Paid out</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Status */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Account Connected</span>
                <Badge variant={safeEarnings.stripeAccountStatus?.connected ? "default" : "secondary"}>
                  {safeEarnings.stripeAccountStatus?.connected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Charges Enabled</span>
                <Badge variant={safeEarnings.stripeAccountStatus?.charges_enabled ? "default" : "secondary"}>
                  {safeEarnings.stripeAccountStatus?.charges_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Payouts Enabled</span>
                <Badge variant={safeEarnings.stripeAccountStatus?.payouts_enabled ? "default" : "secondary"}>
                  {safeEarnings.stripeAccountStatus?.payouts_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            {safeEarnings.stripeAccountStatus?.requirements && safeEarnings.stripeAccountStatus.requirements.length > 0 && (
              <Alert className="border-amber-600 bg-amber-600/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-amber-200">
                  <div className="space-y-2">
                    <p className="font-medium">Action Required:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {safeEarnings.stripeAccountStatus.requirements.map((req, index) => (
                        <li key={index} className="text-sm">{req}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recent Transactions</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {safeEarnings.recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400">No transactions yet</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Transactions will appear here once you start receiving payments
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {safeEarnings.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">
                        {transaction.description || 'Payment'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(transaction.created)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <Badge 
                        variant={transaction.status === 'succeeded' ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
