'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface StripeAccountStatus {
  connected: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements?: string[]
  account_id?: string
}

export default function ConnectStripePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current account status
  const fetchAccountStatus = async () => {
    if (!user) return

    try {
      setError(null)
      const response = await fetch('/api/stripe/connect/status', {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAccountStatus(data)
      } else {
        // No account connected yet
        setAccountStatus({
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false
        })
      }
    } catch (error: any) {
      console.error('Error fetching account status:', error)
      setError(error.message || 'Failed to load account status')
    } finally {
      setLoading(false)
    }
  }

  // Connect to Stripe
  const handleConnectStripe = async () => {
    if (!user) return

    try {
      setConnecting(true)
      setError(null)

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
        throw new Error('Failed to generate Stripe Connect URL')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Connect
      window.location.href = url
    } catch (error: any) {
      console.error('Error connecting to Stripe:', error)
      setError(error.message || 'Failed to connect to Stripe')
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Stripe. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  // Refresh account status
  const handleRefreshStatus = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/stripe/connect/refresh-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      })

      if (response.ok) {
        await fetchAccountStatus()
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
    }
  }

  useEffect(() => {
    fetchAccountStatus()
  }, [user])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
            <p className="text-zinc-400">Loading account status...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">Connect with Stripe</h1>
          <p className="text-zinc-400 max-w-md mx-auto">
            Connect your Stripe account to start receiving payments for your content
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
                    <Badge variant={accountStatus.charges_enabled ? "default" : "secondary"}>
                      {accountStatus.charges_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-300">Payouts Enabled</span>
                    <Badge variant={accountStatus.payouts_enabled ? "default" : "secondary"}>
                      {accountStatus.payouts_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-300">Details Submitted</span>
                    <Badge variant={accountStatus.details_submitted ? "default" : "secondary"}>
                      {accountStatus.details_submitted ? "Complete" : "Incomplete"}
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

        {/* Info Card */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-white text-lg">Why Connect Stripe?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Receive payments directly from customers</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Automatic payouts to your bank account</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Detailed transaction and earnings reports</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Secure and PCI compliant payment processing</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
