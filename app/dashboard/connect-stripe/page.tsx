"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, Globe, Shield, CheckCircle, ExternalLink, AlertCircle, Bug } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useSearchParams } from 'next/navigation'

export default function ConnectStripePage() {
  const { user } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Check for error parameters
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    const debugParam = searchParams.get('debug')

    if (errorParam) {
      setError(messageParam || errorParam)
    }

    if (debugParam) {
      try {
        const parsedDebug = JSON.parse(decodeURIComponent(debugParam))
        setDebugInfo(parsedDebug)
      } catch (e) {
        console.error('Failed to parse debug info:', e)
      }
    }
  }, [searchParams])

  const handleCreateAccount = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      console.error("Error creating Stripe account:", err)
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
        headers: {
          "Content-Type": "application/json",
        },
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
      console.error("Error connecting Stripe account:", err)
      setError(err instanceof Error ? err.message : "Failed to connect account")
    } finally {
      setLoading(false)
    }
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

      {/* Error Display */}
      {error && (
        <div className="px-16 pb-8">
          <Card className="border-red-600/50 bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-400 mb-4">
                <AlertCircle className="h-5 w-5" />
                <span>Connection Error: {error}</span>
              </div>
              
              {debugInfo && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowDebug(!showDebug)} 
                    variant="outline" 
                    size="sm" 
                    className="border-red-600/50 text-red-400 hover:bg-red-900/40"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    {showDebug ? 'Hide' : 'Show'} Debug Info
                  </Button>
                  
                  {showDebug && (
                    <div className="bg-gray-800 p-4 rounded text-sm">
                      <h4 className="text-white font-semibold mb-2">Debug Log:</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.map((log: any, index: number) => (
                          <div key={index} className="text-gray-300">
                            <span className="text-blue-400">[Step {log.step}]</span> {log.action}
                            {log.timestamp && (
                              <span className="text-gray-500 ml-2">
                                ({new Date(log.timestamp).toLocaleTimeString()})
                              </span>
                            )}
                            {log.error && (
                              <div className="text-red-400 ml-4 text-xs">
                                ERROR: {typeof log.error === 'string' ? log.error : JSON.stringify(log.error)}
                              </div>
                            )}
                            {log.data && (
                              <div className="text-gray-400 ml-4 text-xs">
                                {JSON.stringify(log.data)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={() => setError(null)} 
                  variant="outline" 
                  size="sm" 
                  className="border-red-600/50 text-red-400 hover:bg-red-900/40"
                >
                  Dismiss
                </Button>
                <Button 
                  onClick={() => window.location.href = '/debug-stripe-connection'} 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-600/50 text-blue-400 hover:bg-blue-900/40"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Full Debug
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Benefits Section */}
      <div className="grid grid-cols-3 gap-6 px-16 mb-12">
        <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
          <Globe className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
          <p className="text-gray-400 text-sm">Supported in 40+ countries</p>
        </div>
        
        <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
          <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Secure & Reliable</h3>
          <p className="text-gray-400 text-sm">Bank-level security and encryption</p>
        </div>
        
        <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Quick Setup</h3>
          <p className="text-gray-400 text-sm">Get started in minutes</p>
        </div>
      </div>

      {/* Connection Options */}
      <div className="grid grid-cols-2 gap-6 px-16 mb-12">
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
              <p className="text-gray-400 text-sm">Connect your existing Stripe account securely</p>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Secure OAuth connection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">No manual setup required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Instant verification</span>
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
            Secure OAuth flow through Stripe
          </p>
        </Card>
      </div>
    </div>
  )
}
