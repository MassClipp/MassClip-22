import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

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
  message?: string
  error?: string
  stripeAccountId?: string | null
  lastUpdated: string
  debug?: any
}

export function useStripeEarnings() {
  const [user, loading, error] = useAuthState(auth)
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
      
      // Get the Firebase ID token
      const idToken = await user.getIdToken()
      
      const response = await fetch('/api/dashboard/earnings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Earnings data received:', data)
      setEarningsData(data)
    } catch (err) {
      console.error('❌ Error fetching earnings:', err)
      setFetchError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchEarnings()
    } else if (!loading && !user) {
      setIsLoading(false)
    }
  }, [user, loading])

  const refetch = () => {
    fetchEarnings()
  }

  return {
    earningsData,
    isLoading: isLoading || loading,
    error: fetchError || (error ? error.message : null),
    refetch,
    user,
  }
}
