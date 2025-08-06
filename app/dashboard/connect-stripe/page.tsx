'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useFirebaseAuth } from '@/hooks/use-firebase-auth'
import { ExternalLink, AlertCircle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [showDebugDetails, setShowDebugDetails] = useState(false)
  
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const debugData = searchParams.get('debug')
  
  let parsedDebugData = null
  if (debugData) {
    try {
      parsedDebugData = JSON.parse(decodeURIComponent(debugData))
    } catch (e) {
      console.error('Failed to parse debug data:', e)
    }
  }

  const handleConnect = () => {
    if (!user?.uid) return

    const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    
    if (!clientId) {
      alert('Stripe Client ID not configured')
      return
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: `${siteUrl}/api/stripe/connect/oauth-callback`,
      state: user.uid, // Pass user ID as state
    })

    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
    window.location.href = stripeConnectUrl
  }

  const getErrorMessage = (errorCode: string, message?: string) => {
    const errorMessages: Record<string, string> = {
      oauth_failed: 'Stripe OAuth authorization failed',
      missing_params: 'Missing required parameters in OAuth callback',
      config_error: 'Stripe configuration error',
      token_exchange_failed: 'Failed to exchange authorization code for access token',
      invalid_oauth_response: 'Invalid response from Stripe OAuth',
      account_fetch_failed: 'Failed to fetch account details from Stripe',
      storage_failed: 'Failed to store connection data',
      callback_error: 'Unexpected error during OAuth callback'
    }

    const baseMessage = errorMessages[errorCode] || 'Unknown error occurred'
    return message ? `${baseMessage}: ${message}` : baseMessage
  }

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to connect your Stripe account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connect Stripe Account</h1>
        <p className="text-muted-foreground">Connect your Stripe account to start receiving payments</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Connection Failed</p>
              <p>{getErrorMessage(error, message || undefined)}</p>
              
              {parsedDebugData && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebugDetails(!showDebugDetails)}
                  >
                    {showDebugDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showDebugDetails ? 'Hide' : 'Show'} Debug Details
                  </Button>
                  
                  {showDebugDetails && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Debug Information</h4>
                      <div className="space-y-2">
                        {parsedDebugData.map((step: any, index: number) => (
                          <div key={index} className="flex items-start space-x-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {step.step}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{step.action}</p>
                              {step.data && (
                                <pre className="text-xs text-muted-foreground mt-1 overflow-auto">
                                  {JSON.stringify(step.data, null, 2)}
                                </pre>
                              )}
                              {step.error && (
                                <p className="text-xs text-red-600 mt-1">{step.error}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>
            Connect your Stripe account to start accepting payments and receiving payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">What happens when you connect:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• You'll be redirected to Stripe to authorize the connection</li>
              <li>• We'll securely store your connection details</li>
              <li>• You can start receiving payments immediately</li>
              <li>• You maintain full control of your Stripe account</li>
            </ul>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleConnect} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect with Stripe
            </Button>
            
            <Button variant="outline" asChild>
              <a href="/debug-stripe-connection" target="_blank" rel="noopener noreferrer">
                View Debug Info
              </a>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              By connecting your Stripe account, you agree to Stripe's{' '}
              <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="underline">
                Connected Account Agreement
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info for Debugging */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Information</CardTitle>
          <CardDescription>Current configuration details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">User ID</p>
              <p className="text-muted-foreground font-mono">{user.uid}</p>
            </div>
            <div>
              <p className="font-medium">Site URL</p>
              <p className="text-muted-foreground">{process.env.NEXT_PUBLIC_SITE_URL}</p>
            </div>
            <div>
              <p className="font-medium">Stripe Client ID</p>
              <p className="text-muted-foreground">
                {process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID ? 'Configured' : 'Missing'}
              </p>
            </div>
            <div>
              <p className="font-medium">Callback URL</p>
              <p className="text-muted-foreground font-mono">
                {process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/oauth-callback
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
