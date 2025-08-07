"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, AlertCircle, ExternalLink, CreditCard, Globe, Shield, Info, Bug } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import Link from "next/link"

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    // Check for error parameters in URL
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const messageParam = urlParams.get('message')
    const debugParam = urlParams.get('debug')

    if (errorParam) {
      setError(messageParam || errorParam)
    }

    if (debugParam) {
      try {
        const debugData = JSON.parse(decodeURIComponent(debugParam))
        setDebugInfo(debugData)
      } catch (e) {
        console.error('Failed to parse debug info:', e)
      }
    }
  }, [])

  const handleCreateAccount = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe account")
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleConnectExisting = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect Stripe account")
      }
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect account")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-700 rounded-full mb-4 shadow-lg">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Connect Your Stripe Account
        </h1>
        <p className="text-gray-400 mb-8">
          Start accepting payments and track your earnings
        </p>
      </div>

      <div className="px-8 max-w-6xl mx-auto">
        {/* Error Display */}
        {error && (
          <Alert className="mb-8 border-red-600/50 bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Connection Failed:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Information */}
        {debugInfo && (
          <Card className="mb-8 border-blue-600/50 bg-blue-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Bug className="h-5 w-5" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-white">Connection Process Log:</h4>
                  <div className="bg-gray-800 p-3 rounded text-sm font-mono max-h-60 overflow-y-auto">
                    {debugInfo.map((log: any, index: number) => (
                      <div key={index} className="mb-1 text-gray-300">
                        <span className="text-blue-400">[{log.step}]</span> {log.action}
                        {log.timestamp && <span className="text-gray-500 ml-2">({new Date(log.timestamp).toLocaleTimeString()})</span>}
                        {log.error && <span className="text-red-400 ml-2">ERROR: {log.error}</span>}
                        {log.data && (
                          <pre className="ml-4 text-xs text-gray-400 mt-1">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setDebugInfo(null)} 
                    variant="outline" 
                    size="sm"
                    className="border-blue-600/50 text-blue-400 hover:bg-blue-900/40"
                  >
                    Hide Debug Info
                  </Button>
                  <Link href="/debug-stripe-connection">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-blue-600/50 text-blue-400 hover:bg-blue-900/40"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Full Debug Page
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits Section */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
            <Globe className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-gray-400 text-sm">Accept payments from customers worldwide</p>
          </div>
          
          <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
            <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Reliable</h3>
            <p className="text-gray-400 text-sm">Bank-level security and encryption</p>
          </div>
          
          <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
            <CreditCard className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Easy Setup</h3>
            <p className="text-gray-400 text-sm">Quick 5-minute onboarding process</p>
          </div>
        </div>

        {/* Connection Options */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          {/* Create New Account */}
          <Card className="bg-gray-800/30 border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Create New Stripe Account</h3>
                <p className="text-gray-400 text-sm">Set up a new Stripe account to start accepting payments</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Automatic payouts to your bank</span>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateAccount}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Create Stripe Account
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              You'll be redirected to Stripe to complete setup
            </p>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-gray-800/30 border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Connect Existing Account</h3>
                <p className="text-gray-400 text-sm">Securely connect your existing Stripe account</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Stripe handles verification</span>
              </div>
            </div>
            
            <Button 
              onClick={handleConnectExisting}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with Stripe
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Stripe will detect your existing account and connect it securely
            </p>
          </Card>
        </div>

        {/* Debug Tools */}
        <Card className="mb-8 bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bug className="h-5 w-5" />
              Debug Tools
            </CardTitle>
            <CardDescription className="text-gray-400">
              Diagnostic tools to help troubleshoot connection issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Link href="/debug-stripe-connection">
                <Button variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-800">
                  <Bug className="mr-2 h-4 w-4" />
                  Connection Debug
                </Button>
              </Link>
              <Link href={`/dashboard/earnings?debugUserId=${user.uid}`}>
                <Button variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-800">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Test Earnings API
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Info className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">How It Works</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Choose Your Option</h3>
              <p className="text-gray-400 text-sm">Create a new account or connect an existing one</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Complete Setup</h3>
              <p className="text-gray-400 text-sm">Follow Stripe's secure onboarding process</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Start Earning</h3>
              <p className="text-gray-400 text-sm">Begin accepting payments immediately</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
