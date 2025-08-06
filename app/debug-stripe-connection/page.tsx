'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useFirebaseAuth } from '@/hooks/use-firebase-auth'
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface DebugInfo {
  timestamp: string
  userId: string
  checks: Array<{
    name: string
    status: 'PASS' | 'FAIL' | 'ERROR'
    details: string
  }>
  connectedAccount?: {
    exists: boolean
    stripe_user_id?: string
    connected?: boolean
    charges_enabled?: boolean
    payouts_enabled?: boolean
    details_submitted?: boolean
    connectedAt?: string
    lastUpdated?: string
  }
  userDocument?: {
    exists: boolean
    stripeConnected?: boolean
    connectedAccountId?: string
    stripeConnectionUpdatedAt?: string
  }
  environment: {
    hasStripeSecretKey: boolean
    hasStripeClientId: boolean
    siteUrl: string
    hasFirebaseProjectId: boolean
    hasFirebaseClientEmail: boolean
    hasFirebasePrivateKey: boolean
  }
}

export default function DebugStripeConnectionPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDebugInfo = async () => {
    if (!user?.uid) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/debug/stripe-connection-status?userId=${user.uid}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch debug info')
      }

      setDebugInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.uid) {
      fetchDebugInfo()
    }
  }, [user?.uid])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant = status === 'PASS' ? 'default' : status === 'FAIL' ? 'destructive' : 'secondary'
    return <Badge variant={variant}>{status}</Badge>
  }

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to view debug information.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Connection Debug</h1>
          <p className="text-muted-foreground">Diagnostic information for Stripe Connect integration</p>
        </div>
        <Button onClick={fetchDebugInfo} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading debug information...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {debugInfo && (
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono">{debugInfo.userId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Timestamp</p>
                  <p className="text-sm text-muted-foreground">{new Date(debugInfo.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Checks */}
          <Card>
            <CardHeader>
              <CardTitle>System Checks</CardTitle>
              <CardDescription>Core system component availability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {debugInfo.checks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium">{check.name}</p>
                        <p className="text-sm text-muted-foreground">{check.details}</p>
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Connected Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Account Status</CardTitle>
              <CardDescription>Stripe Connect account information</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo.connectedAccount?.exists ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Stripe Account ID</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {debugInfo.connectedAccount.stripe_user_id || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <Badge variant={debugInfo.connectedAccount.connected ? 'default' : 'destructive'}>
                        {debugInfo.connectedAccount.connected ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Charges Enabled</p>
                      <Badge variant={debugInfo.connectedAccount.charges_enabled ? 'default' : 'destructive'}>
                        {debugInfo.connectedAccount.charges_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payouts Enabled</p>
                      <Badge variant={debugInfo.connectedAccount.payouts_enabled ? 'default' : 'destructive'}>
                        {debugInfo.connectedAccount.payouts_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Details Submitted</p>
                      <Badge variant={debugInfo.connectedAccount.details_submitted ? 'default' : 'destructive'}>
                        {debugInfo.connectedAccount.details_submitted ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>

                  {debugInfo.connectedAccount.connectedAt && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Connected At</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(debugInfo.connectedAccount.connectedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Last Updated</p>
                          <p className="text-sm text-muted-foreground">
                            {debugInfo.connectedAccount.lastUpdated 
                              ? new Date(debugInfo.connectedAccount.lastUpdated).toLocaleString()
                              : 'Never'
                            }
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p className="font-medium">No Connected Account Found</p>
                  <p className="text-sm text-muted-foreground">No Stripe Connect account data exists for this user</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Document Status */}
          <Card>
            <CardHeader>
              <CardTitle>User Document Status</CardTitle>
              <CardDescription>User profile Stripe connection flags</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo.userDocument?.exists ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Stripe Connected Flag</p>
                      <Badge variant={debugInfo.userDocument.stripeConnected ? 'default' : 'destructive'}>
                        {debugInfo.userDocument.stripeConnected ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Connected Account ID</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {debugInfo.userDocument.connectedAccountId || 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  {debugInfo.userDocument.stripeConnectionUpdatedAt && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium">Connection Updated At</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(debugInfo.userDocument.stripeConnectionUpdatedAt).toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p className="font-medium">No User Document Found</p>
                  <p className="text-sm text-muted-foreground">User profile document does not exist</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environment Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Required environment variables and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Stripe Configuration</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Secret Key</span>
                      <Badge variant={debugInfo.environment.hasStripeSecretKey ? 'default' : 'destructive'}>
                        {debugInfo.environment.hasStripeSecretKey ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Client ID</span>
                      <Badge variant={debugInfo.environment.hasStripeClientId ? 'default' : 'destructive'}>
                        {debugInfo.environment.hasStripeClientId ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Firebase Configuration</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Project ID</span>
                      <Badge variant={debugInfo.environment.hasFirebaseProjectId ? 'default' : 'destructive'}>
                        {debugInfo.environment.hasFirebaseProjectId ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Client Email</span>
                      <Badge variant={debugInfo.environment.hasFirebaseClientEmail ? 'default' : 'destructive'}>
                        {debugInfo.environment.hasFirebaseClientEmail ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Private Key</span>
                      <Badge variant={debugInfo.environment.hasFirebasePrivateKey ? 'default' : 'destructive'}>
                        {debugInfo.environment.hasFirebasePrivateKey ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <p className="text-sm font-medium">Site URL</p>
                <p className="text-sm text-muted-foreground font-mono">{debugInfo.environment.siteUrl}</p>
              </div>
            </CardContent>
          </Card>

          {/* Raw Debug Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Debug Data</CardTitle>
              <CardDescription>Complete debug information (JSON)</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
