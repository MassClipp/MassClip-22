'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, CreditCard, Globe, Shield } from 'lucide-react'
import { StripeConnectButton } from '@/components/stripe-connect-button'
import { useAuth } from '@/hooks/use-firebase-auth'
import { toast } from '@/hooks/use-toast'

export default function ConnectStripePage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'not_connected' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for success/error parameters
  useEffect(() => {
    const connected = searchParams.get('connected')
    const refresh = searchParams.get('refresh')
    const error = searchParams.get('error')

    if (connected === 'true') {
      toast({
        title: 'Success!',
        description: 'Your Stripe account has been connected successfully.',
      })
      // Redirect to earnings page after a short delay
      setTimeout(() => {
        router.push('/dashboard/earnings')
      }, 2000)
    } else if (refresh === 'true') {
      toast({
        title: 'Setup Incomplete',
        description: 'Please complete your Stripe account setup.',
        variant: 'destructive',
      })
    } else if (error) {
      toast({
        title: 'Connection Error',
        description: decodeURIComponent(error),
        variant: 'destructive',
      })
    }
  }, [searchParams, router])

  // Check connection status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return

      try {
        const idToken = await user.getIdToken()
        const response = await fetch('/api/stripe/connect/status', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        })

        const data = await response.json()

        if (response.ok) {
          setConnectionStatus(data.connected ? 'connected' : 'not_connected')
        } else {
          setConnectionStatus('error')
          setError(data.error || 'Failed to check connection status')
        }
      } catch (error) {
        console.error('Status check error:', error)
        setConnectionStatus('error')
        setError('Failed to check connection status')
      }
    }

    if (user) {
      checkStatus()
    }
  }, [user])

  const handleConnectionError = (errorMessage: string) => {
    setError(errorMessage)
    setConnectionStatus('error')
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to connect your Stripe account.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
          <p className="text-muted-foreground">
            Start accepting payments and track your earnings
          </p>
        </div>

        {/* Success Message */}
        {searchParams.get('connected') === 'true' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your Stripe account has been connected successfully! Redirecting to earnings dashboard...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Accept Payments</h3>
              <p className="text-sm text-muted-foreground">
                Process payments from customers worldwide
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Global Reach</h3>
              <p className="text-sm text-muted-foreground">
                Supported in 40+ countries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm text-muted-foreground">
                Bank-level security and encryption
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Status */}
        {connectionStatus === 'connected' ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-center font-semibold text-green-800 mb-2">
                Stripe Account Connected
              </h3>
              <p className="text-center text-green-700 mb-4">
                Your account is ready to accept payments
              </p>
              <div className="text-center">
                <Button onClick={() => router.push('/dashboard/earnings')}>
                  View Earnings Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create New Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Create New Stripe Account
                </CardTitle>
                <CardDescription>
                  Set up a new Stripe account to start accepting payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeConnectButton
                  onSuccess={() => setConnectionStatus('connected')}
                  onError={handleConnectionError}
                />
              </CardContent>
            </Card>

            {/* Connect Existing Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Already Have a Stripe Account?
                </CardTitle>
                <CardDescription>
                  Securely connect your existing Stripe account through Stripe Connect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeConnectButton
                  onSuccess={() => setConnectionStatus('connected')}
                  onError={handleConnectionError}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
