"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export default function DebugStripeConnectionPage() {
  const { user } = useFirebaseAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDebugCheck = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/debug/stripe-connection-status?userId=${user.uid}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Debug check failed')
      }

      setDebugInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDebugCheck()
    }
  }, [user])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-900/20 text-green-400 border-green-600/50'
      case 'FAIL':
        return 'bg-red-900/20 text-red-400 border-red-600/50'
      case 'ERROR':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-600/50'
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-600/50'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Stripe Connection Debug</h1>
            <p className="text-gray-400">Diagnostic information for Stripe integration</p>
          </div>
          <Button 
            onClick={runDebugCheck} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {error && (
          <Card className="mb-8 border-red-600/50 bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {debugInfo && (
          <div className="space-y-6">
            {/* System Checks */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">System Checks</CardTitle>
                <CardDescription className="text-gray-400">
                  Basic system and configuration validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {debugInfo.checks?.map((check: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <span className="text-white">{check.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      <span className="text-sm text-gray-400">{check.details}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Connected Account Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Connected Account Status</CardTitle>
                <CardDescription className="text-gray-400">
                  Information from connectedStripeAccounts collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugInfo.connectedAccount?.exists ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400">Stripe User ID:</span>
                        <p className="text-white font-mono">{debugInfo.connectedAccount.stripe_user_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Connected:</span>
                        <p className="text-white">{debugInfo.connectedAccount.connected ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Charges Enabled:</span>
                        <p className="text-white">{debugInfo.connectedAccount.charges_enabled ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Payouts Enabled:</span>
                        <p className="text-white">{debugInfo.connectedAccount.payouts_enabled ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Details Submitted:</span>
                        <p className="text-white">{debugInfo.connectedAccount.details_submitted ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Connected At:</span>
                        <p className="text-white">{debugInfo.connectedAccount.connectedAt || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400">No connected account found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Document Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Document Status</CardTitle>
                <CardDescription className="text-gray-400">
                  Information from users collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugInfo.userDocument?.exists ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400">Stripe Connected:</span>
                        <p className="text-white">{debugInfo.userDocument.stripeConnected ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Connected Account ID:</span>
                        <p className="text-white font-mono">{debugInfo.userDocument.connectedAccountId || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Last Updated:</span>
                        <p className="text-white">{debugInfo.userDocument.stripeConnectionUpdatedAt || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400">User document not found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Environment Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Environment Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Environment variables and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Stripe Secret Key:</span>
                    <p className="text-white">{debugInfo.environment?.hasStripeSecretKey ? 'Present' : 'Missing'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Stripe Client ID:</span>
                    <p className="text-white">{debugInfo.environment?.hasStripeClientId ? 'Present' : 'Missing'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Site URL:</span>
                    <p className="text-white font-mono">{debugInfo.environment?.siteUrl || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Raw Debug Data */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Raw Debug Data</CardTitle>
                <CardDescription className="text-gray-400">
                  Complete debug information (JSON)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 p-4 rounded text-sm text-gray-300 overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
