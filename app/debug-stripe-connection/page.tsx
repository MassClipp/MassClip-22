"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Database, User, CreditCard, Globe, Bug } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface DebugCheck {
  name: string
  status: "PASS" | "ERROR" | "NOT_FOUND"
  details: string
  data?: any
}

interface DebugResponse {
  timestamp: string
  userId: string
  checks: DebugCheck[]
  environment: {
    hasStripeSecretKey: boolean
    hasStripeClientId: boolean
    siteUrl: string
  }
  debug: {
    logs: any[]
    totalSteps: number
  }
}

export default function DebugStripeConnectionPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [debugData, setDebugData] = useState<DebugResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDebugCheck = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/debug/stripe-connection-status?userId=${user.uid}`)
      const data = await response.json()

      if (response.ok) {
        setDebugData(data)
      } else {
        setError(data.error || 'Debug check failed')
        setDebugData(data) // Still show partial data if available
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.uid) {
      runDebugCheck()
    }
  }, [user?.uid])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "ERROR":
        return <XCircle className="h-5 w-5 text-red-400" />
      case "NOT_FOUND":
        return <AlertCircle className="h-5 w-5 text-yellow-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return <Badge className="bg-green-900/20 text-green-400 border-green-600/50">PASS</Badge>
      case "ERROR":
        return <Badge className="bg-red-900/20 text-red-400 border-red-600/50">ERROR</Badge>
      case "NOT_FOUND":
        return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-600/50">NOT FOUND</Badge>
      default:
        return <Badge variant="secondary">UNKNOWN</Badge>
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Stripe Connection Debug</h1>
            <p className="text-gray-400 mt-2">Diagnostic information for Stripe integration</p>
          </div>
          <Button 
            onClick={runDebugCheck} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Running..." : "Refresh"}
          </Button>
        </div>

        {/* User Info */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong className="text-gray-300">User ID:</strong> <span className="text-white font-mono">{user.uid}</span></div>
              <div><strong className="text-gray-300">Email:</strong> <span className="text-white">{user.email}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Check */}
        {debugData?.environment && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5" />
                Environment Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Stripe Secret Key</span>
                  {debugData.environment.hasStripeSecretKey ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Stripe Client ID</span>
                  {debugData.environment.hasStripeClientId ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Site URL</span>
                  <span className="text-white text-sm">{debugData.environment.siteUrl}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Checks */}
        {debugData?.checks && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="h-5 w-5" />
                Connection Status Checks
              </CardTitle>
              <CardDescription className="text-gray-400">
                Diagnostic checks for database connectivity and data integrity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {debugData.checks.map((check, index) => (
                <div key={index} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <h3 className="font-semibold text-white">{check.name}</h3>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{check.details}</p>
                  {check.data && (
                    <div className="bg-gray-900 p-3 rounded text-xs font-mono">
                      <pre className="text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(check.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="bg-red-900/20 border-red-600/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Debug Data */}
        {debugData && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bug className="h-5 w-5" />
                Raw Debug Data
              </CardTitle>
              <CardDescription className="text-gray-400">
                Complete debug information (JSON)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-gray-300 text-xs whitespace-pre-wrap">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamp */}
        {debugData?.timestamp && (
          <div className="text-center text-sm text-gray-500">
            Last updated: {new Date(debugData.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
