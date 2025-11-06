'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/use-firebase-auth'

interface StripeAccount {
  stripe_user_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  email: string
  business_type?: string
  livemode: boolean
  connectedAt: string
  lastUpdated: string
  requirements: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
}

interface ConnectionStatus {
  connected: boolean
  fullySetup: boolean
  account?: StripeAccount
}

export function StripeConnectOnboarding() {
  const { user } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const checkConnectionStatus = async (refresh = false) => {
    if (!user?.uid) return

    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch(`/api/stripe/connect/status-check?userId=${user.uid}&refresh=${refresh}`)
      const data = await response.json()

      if (response.ok) {
        setStatus(data)
      } else {
        console.error('Failed to check connection status:', data.error)
        setStatus({ connected: false, fullySetup: false })
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      setStatus({ connected: false, fullySetup: false })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleConnect = async () => {
    if (!user?.uid) return

    try {
      setConnecting(true)

      const response = await fetch('/api/stripe/connect/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Stripe OAuth
        window.location.href = data.authUrl
      } else {
        console.error('Failed to generate OAuth URL:', data.error)
        alert('Failed to start connection process. Please try again.')
      }
    } catch (error) {
      console.error('Error starting connection:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const handleRefresh = () => {
    checkConnectionStatus(true)
  }

  useEffect(() => {
    if (user?.uid) {
      checkConnectionStatus()
    }
  }, [user?.uid])

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Checking connection status...</span>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            Failed to check connection status. Please refresh the page.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stripe Account Connection
            {status.connected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
          </CardTitle>
          <CardDescription>
            {status.connected 
              ? 'Your Stripe account is connected to MassClip'
              : 'Connect your Stripe account to start receiving payments'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.connected && status.account ? (
            <div className="space-y-4">
              {/* Account Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={status.account.charges_enabled ? "default" : "secondary"}>
                    {status.account.charges_enabled ? "✓" : "✗"} Charges
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.account.payouts_enabled ? "default" : "secondary"}>
                    {status.account.payouts_enabled ? "✓" : "✗"} Payouts
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.account.details_submitted ? "default" : "secondary"}>
                    {status.account.details_submitted ? "✓" : "✗"} Details
                  </Badge>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div><strong>Account ID:</strong> {status.account.stripe_user_id}</div>
                <div><strong>Email:</strong> {status.account.email}</div>
                <div><strong>Country:</strong> {status.account.country}</div>
                <div><strong>Mode:</strong> {status.account.livemode ? 'Live' : 'Test'}</div>
                <div><strong>Connected:</strong> {new Date(status.account.connectedAt).toLocaleDateString()}</div>
                <div><strong>Last Updated:</strong> {new Date(status.account.lastUpdated).toLocaleDateString()}</div>
              </div>

              {/* Status Message */}
              {status.fullySetup ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <strong>Account fully set up!</strong>
                  </div>
                  <p className="text-green-700 mt-1">
                    You can now receive payments through MassClip.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-5 w-5" />
                    <strong>Setup incomplete</strong>
                  </div>
                  <p className="text-yellow-700 mt-1">
                    Please complete your Stripe account setup to start receiving payments.
                  </p>
                  {status.account.requirements.currently_due.length > 0 && (
                    <p className="text-yellow-600 text-sm mt-2">
                      Required: {status.account.requirements.currently_due.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  variant="outline"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Status'
                  )}
                </Button>
                
                {!status.fullySetup && (
                  <Button 
                    onClick={() => window.open(`https://dashboard.stripe.com/connect/accounts/${status.account?.stripe_user_id}`, '_blank')}
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Complete Setup
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Connect your Stripe account to start accepting payments on MassClip.
              </p>
              
              <Button 
                onClick={handleConnect} 
                disabled={connecting}
                size="lg"
                className="w-full md:w-auto"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  'Connect with Stripe'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            If you're having trouble connecting your Stripe account, here are some common solutions:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Make sure you have a valid Stripe account</li>
            <li>Check that your browser allows popups from this site</li>
            <li>Try refreshing the page and connecting again</li>
            <li>Contact support if the issue persists</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// Export as default and named export
export default StripeConnectOnboarding
