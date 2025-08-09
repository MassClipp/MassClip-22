import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/firebase/config'

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  nextPayoutDate: Date | null
  payoutSchedule: string
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
  monthlyBreakdown: {
    month: string
    earnings: number
    transactionCount: number
  }[]
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
    conversionRate: number
  }
  balanceBreakdown: {
    available: { amount: number; currency: string }[]
    pending: { amount: number; currency: string }[]
    reserved: { amount: number; currency: string }[]
  }
  isDemo: boolean
  isUnconnected: boolean
  accountNotReady?: boolean
  message?: string
  error?: string
  stripeAccountId?: string | null
  lastUpdated: string
  debug?: any
}

export function useStripeEarnings() {
  const [user, loading, authError] = useAuthState(auth)
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchEarnings = async () => {
    if (!user) {
      console.log('❌ No authenticated user found')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setFetchError(null)
      
      console.log('🔍 Fetching earnings data for user:', user.uid)
      
      // Get the Firebase ID token - this is crucial
      const idToken = await user.getIdToken(true) // Force refresh token
      
      console.log('🔑 Got Firebase ID token, making API call...')
      
      const response = await fetch('/api/dashboard/earnings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        // Disable caching to ensure fresh data
        cache: 'no-store'
      })

      console.log('📡 API Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Earnings data received:', {
        totalEarnings: data.totalEarnings,
        isUnconnected: data.isUnconnected,
        accountNotReady: data.accountNotReady,
        isDemo: data.isDemo,
        accountStatus: data.accountStatus,
        hasRecentTransactions: data.recentTransactions?.length > 0
      })
      
      setEarningsData(data)
    } catch (err) {
      console.error('❌ Error fetching earnings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setFetchError(errorMessage)
      
      // Set a fallback empty state instead of null
      setEarningsData({
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        last30DaysEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        nextPayoutDate: null,
        payoutSchedule: 'manual',
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
        salesMetrics: {
          totalSales: 0,
          thisMonthSales: 0,
          last30DaysSales: 0,
          averageTransactionValue: 0,
          conversionRate: 0,
        },
        balanceBreakdown: {
          available: [],
          pending: [],
          reserved: [],
        },
        isDemo: true,
        isUnconnected: true,
        error: errorMessage,
        lastUpdated: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔄 useStripeEarnings effect triggered:', { 
      loading, 
      userExists: !!user, 
      userId: user?.uid 
    })
    
    if (!loading && user) {
      console.log('✅ User authenticated, fetching earnings...')
      fetchEarnings()
    } else if (!loading && !user) {
      console.log('❌ No user found, setting loading to false')
      setIsLoading(false)
      setEarningsData(null)
    }
  }, [user, loading])

  const refetch = () => {
    console.log('🔄 Manual refetch triggered')
    if (user) {
      fetchEarnings()
    }
  }

  return {
    earningsData,
    isLoading: isLoading || loading,
    error: fetchError || (authError ? authError.message : null),
    refetch,
    user,
  }
}
