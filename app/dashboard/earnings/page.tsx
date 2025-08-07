'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DollarSign, TrendingUp, CreditCard, BarChart3, RefreshCw, Bug } from 'lucide-react'
import { useFirebaseAuth } from '@/hooks/use-firebase-auth'

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string | null
  status?: string
  lastUpdated?: string | null
  debug?: any
}

interface EarningsData {
  totalEarnings: number
  thisMonth: number
  availableBalance: number
  totalSales: number
  recentPerformance: {
    last30Days: number
    thisMonthSales: number
    last30DaysSales: number
  }
  payoutInfo: {
    pendingPayout: number
    availableBalance: number
  }
}

export default function EarningsPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [connectionStatus, setConnectionStatus] = useState<StripeConnectionStatus>({ connected: false })
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    availableBalance: 0,
    totalSales: 0,
    recentPerformance: {
      last30Days: 0,
      thisMonthSales: 0,
      last30DaysSales: 0
    },
    payoutInfo: {
      pendingPayout: 0,
      availableBalance: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const checkConnectionStatus = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()
      
      console.log('Checking connection status for user:', user.uid)
      
      const response = await fetch('/api/stripe/connect/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Connection status response:', data)
      
      setConnectionStatus(data)
      
      if (data.connected) {
        // Fetch earnings data if connected
        await fetchEarningsData(token)
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      setConnectionStatus({ 
        connected: false, 
        debug: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchEarningsData = async (token: string) => {
    try {
      const response = await fetch('/api/dashboard/earnings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEarningsData(data)
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error)
    }
  }

  const runDebugTest = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/debug/stripe-connection-test', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setDebugInfo(data)
      setShowDebug(true)
    } catch (error) {
      console.error('Debug test error:', error)
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      setShowDebug(true)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      checkConnectionStatus()
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Earnings</h1>
          <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
            {connectionStatus.connected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runDebugTest}>
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button variant="outline" size="sm" onClick={checkConnectionStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Financial overview and performance metrics
      </p>

      {showDebug && debugInfo && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96 bg-white p-4 rounded border">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setShowDebug(false)}
            >
              Hide Debug
            </Button>
          </CardContent>
        </Card>
      )}

      {!connectionStatus.connected && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Stripe Account Required</h3>
              <p className="text-muted-foreground mb-4">
                Connect your Stripe account to start receiving payments and view earnings.
              </p>
              <Button asChild>
                <a href="/dashboard/connect-stripe">Connect Stripe Account</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earningsData.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earningsData.thisMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+0.0% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earningsData.availableBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earningsData.totalSales}</div>
            <p className="text-xs text-muted-foreground">${earningsData.totalSales > 0 ? (earningsData.totalEarnings / earningsData.totalSales).toFixed(2) : '0.00'} avg order</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
                <p className="text-sm text-muted-foreground">Your earnings breakdown</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Last 30 Days</span>
                  <span className="font-semibold">${earningsData.recentPerformance.last30Days.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>This Month Sales</span>
                  <span className="font-semibold">{earningsData.recentPerformance.thisMonthSales}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Last 30 Days Sales</span>
                  <span className="font-semibold">{earningsData.recentPerformance.last30DaysSales}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Information</CardTitle>
                <p className="text-sm text-muted-foreground">Balance and payout status</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Pending Payout</span>
                  <span className="font-semibold">${earningsData.payoutInfo.pendingPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Available Balance</span>
                  <span className="font-semibold text-green-600">${earningsData.payoutInfo.availableBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Account Status</span>
                  <Badge variant={connectionStatus.connected ? "default" : "secondary"}>
                    {connectionStatus.status || 'Setup Required'}
                  </Badge>
                </div>
                {connectionStatus.connected && (
                  <Button className="w-full" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No transactions yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics data will appear here once you have sales.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
