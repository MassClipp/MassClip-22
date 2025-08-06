"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, AlertCircle, CheckCircle, CreditCard, Globe, Shield, Zap } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface StripeAccountStatus {
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirements?: string[]
  accountId?: string
}

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error parameters in URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    if (errorParam && messageParam) {
      setError(decodeURIComponent(messageParam))
      
      // Show toast notification for the error
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(messageParam),
        variant: "destructive",
      })
    }
  }, [searchParams, toast])

  // Fetch current account status
  const fetchAccountStatus = async () => {
    if (!user) return

    try {
      setError(null)
      const response = await fetch('/api/stripe/connect/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ refresh: false })
      })

      if (response.ok) {
        const data = await response.json()
        setAccountStatus(data)
        console.log('✅ Account status loaded:', data)
      } else {
        // No account connected yet
        setAccountStatus({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false
        })
      }
    } catch (error: any) {
      console.error('Error fetching account status:', error)
      setError(error.message || 'Failed to load account status')
      // Set default status on error
      setAccountStatus({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false
      })
    } finally {
      setLoading(false)
    }
  }

  // Connect to Stripe using OAuth
  const handleConnectStripe = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Stripe account.",
        variant: "destructive",
      })
      return
    }

    try {
      setConnecting(true)
      setError(null)

      console.log('🔄 Initiating Stripe Connect OAuth...')

      // Call API to generate OAuth URL
      const response = await fetch('/api/stripe/connect/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          returnUrl: '/dashboard/earnings?onboarding=success'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate connection URL')
      }

      const { authUrl } = await response.json()
      
      console.log('🔗 Redirecting to Stripe Connect OAuth:', authUrl)

      // Redirect to Stripe OAuth
      window.location.href = authUrl

    } catch (error: any) {
      console.error('Error generating Stripe Connect URL:', error)
      setError(error.message || 'Failed to generate connection URL')
      toast({
        title: "Connection Error",
        description: error.message || "Failed to generate connection URL",
        variant: "destructive",
      })
      setConnecting(false)
    }
  }

  // Refresh account status
  const handleRefreshStatus = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/stripe/connect/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ refresh: true })
      })

      if (response.ok) {
        const data = await response.json()
        setAccountStatus(data)
        toast({
          title: "Status Updated",
          description: "Your Stripe account status has been refreshed.",
        })
      }
    } catch (error) {
      console.error('Error refreshing status:', error)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh account status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchAccountStatus()
    }
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
          <p className="text-lg font-medium text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-white">Authentication Required</CardTitle>
            <CardDescription className="text-zinc-400">
              Please log in to connect your Stripe account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="p-4 bg-blue-600/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Connect Your Stripe Account</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Start accepting payments and receiving payouts by connecting your Stripe account.
            Choose to create a new account or connect an existing one.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-600 bg-red-600/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Account Status Card */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Current status of your Stripe integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!accountStatus?.connected ? (
              // Not Connected State
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="h-8 w-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">No Stripe Account Connected</h3>
                  <p className="text-zinc-400 text-sm">
                    Connect your Stripe account to start accepting payments
                  </p>
                </div>

                <Button
                  onClick={handleConnectStripe}
                  disabled={connecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect with Stripe
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Connected State
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Stripe Account Connected</h3>
                  <p className="text-zinc-400 text-sm">
                    Your account is connected and ready to receive payments
                  </p>
                </div>

                {/* Status Details */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-300">Account Connected</span>
                    <Badge variant="default" className="bg-green-600">
                      Connected
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-300">Charges Enabled</span>
                    <Badge variant={accountStatus.chargesEnabled ? "default" : "secondary"}>
                      {accountStatus.chargesEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-300">Payouts Enabled</span>
                    <Badge variant={accountStatus.payoutsEnabled ? "default" : "secondary"}>
                      {accountStatus.payoutsEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-300">Details Submitted</span>
                    <Badge variant={accountStatus.detailsSubmitted ? "default" : "secondary"}>
                      {accountStatus.detailsSubmitted ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                </div>

                {/* Requirements Alert */}
                {accountStatus.requirements && accountStatus.requirements.length > 0 && (
                  <Alert className="border-amber-600 bg-amber-600/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-amber-200">
                      <div className="space-y-2">
                        <p className="font-medium">Action Required:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {accountStatus.requirements.map((req, index) => (
                            <li key={index} className="text-sm">{req}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleRefreshStatus}
                    variant="outline"
                    className="flex-1 border-zinc-700 hover:bg-zinc-800"
                  >
                    Refresh Status
                  </Button>
                  
                  <Button
                    onClick={() => router.push('/dashboard/earnings')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    View Earnings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-green-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Process payments from customers worldwide</h3>
              <p className="text-sm text-zinc-400">Accept payments in multiple currencies</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-blue-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Supported in 40+ countries</h3>
              <p className="text-sm text-zinc-400">Global payment processing</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-purple-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Bank-level security and encryption</h3>
              <p className="text-sm text-zinc-400">Your data is protected</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-orange-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Automatic daily payouts to your bank</h3>
              <p className="text-sm text-zinc-400">Fast and reliable transfers</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
