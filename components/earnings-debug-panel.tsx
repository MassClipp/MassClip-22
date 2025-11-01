"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bug, Info, RefreshCw, User, Database, Zap, AlertTriangle } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/firebase/config'

interface DebugPanelProps {
  earningsData: any
  loading: boolean
  error: string | null
}

export default function EarningsDebugPanel({ earningsData, loading, error }: DebugPanelProps) {
  const [user] = useAuthState(auth)
  const [apiTestResult, setApiTestResult] = useState<any>(null)
  const [apiTestLoading, setApiTestLoading] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  useEffect(() => {
    const getAuthToken = async () => {
      if (user) {
        try {
          const token = await user.getIdToken()
          setAuthToken(token.substring(0, 50) + '...')
        } catch (error) {
          console.error('Failed to get auth token:', error)
        }
      }
    }
    getAuthToken()
  }, [user])

  const testApiDirectly = async () => {
    setApiTestLoading(true)
    try {
      const token = user ? await user.getIdToken() : null
      const headers: any = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/dashboard/earnings', {
        method: 'GET',
        headers,
      })
      
      const result = await response.json()
      setApiTestResult({
        status: response.status,
        statusText: response.statusText,
        data: result,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setApiTestResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setApiTestLoading(false)
    }
  }

  const testWithDebugUserId = async () => {
    setApiTestLoading(true)
    try {
      const response = await fetch('/api/dashboard/earnings?debugUserId=US57uC2Bm5UTiUE9TRDp0hb18cw2', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setApiTestResult({
        status: response.status,
        statusText: response.statusText,
        data: result,
        timestamp: new Date().toISOString(),
        method: 'Debug User ID'
      })
    } catch (error) {
      setApiTestResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        method: 'Debug User ID'
      })
    } finally {
      setApiTestLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/50 border-yellow-600/50">
        <CardHeader>
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Earnings Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="auth" className="space-y-4">
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger value="auth" className="data-[state=active]:bg-gray-700">Auth Status</TabsTrigger>
              <TabsTrigger value="api" className="data-[state=active]:bg-gray-700">API Response</TabsTrigger>
              <TabsTrigger value="test" className="data-[state=active]:bg-gray-700">API Tests</TabsTrigger>
            </TabsList>

            <TabsContent value="auth" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Firebase Auth</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">User Logged In:</span>
                      <Badge variant={user ? "default" : "destructive"}>
                        {user ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {user && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">User ID:</span>
                          <span className="text-blue-400 font-mono text-xs">{user.uid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Email:</span>
                          <span className="text-gray-300 text-xs">{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Auth Token:</span>
                          <span className="text-gray-300 font-mono text-xs">{authToken || 'Loading...'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Hook State</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loading:</span>
                      <Badge variant={loading ? "secondary" : "default"}>
                        {loading ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error:</span>
                      <Badge variant={error ? "destructive" : "default"}>
                        {error ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {error && (
                      <div className="text-red-400 text-xs mt-2 p-2 bg-red-900/20 rounded">
                        {error}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Has Data:</span>
                      <Badge variant={earningsData ? "default" : "destructive"}>
                        {earningsData ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              {earningsData ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Connection Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Is Unconnected:</span>
                          <Badge variant={earningsData.isUnconnected ? "destructive" : "default"}>
                            {earningsData.isUnconnected ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Account Not Ready:</span>
                          <Badge variant={earningsData.accountNotReady ? "secondary" : "default"}>
                            {earningsData.accountNotReady ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Is Demo:</span>
                          <Badge variant={earningsData.isDemo ? "secondary" : "default"}>
                            {earningsData.isDemo ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Charges Enabled:</span>
                          <Badge variant={earningsData.accountStatus?.chargesEnabled ? "default" : "destructive"}>
                            {earningsData.accountStatus?.chargesEnabled ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payouts Enabled:</span>
                          <Badge variant={earningsData.accountStatus?.payoutsEnabled ? "default" : "destructive"}>
                            {earningsData.accountStatus?.payoutsEnabled ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Details Submitted:</span>
                          <Badge variant={earningsData.accountStatus?.detailsSubmitted ? "default" : "destructive"}>
                            {earningsData.accountStatus?.detailsSubmitted ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Raw API Response</h4>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-64 bg-gray-800 p-3 rounded">
                      {JSON.stringify(earningsData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No earnings data available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={testApiDirectly}
                    disabled={apiTestLoading}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:bg-gray-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {apiTestLoading ? 'Testing...' : 'Test with Auth'}
                  </Button>
                  <Button
                    onClick={testWithDebugUserId}
                    disabled={apiTestLoading}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:bg-gray-700"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    {apiTestLoading ? 'Testing...' : 'Test with Debug User ID'}
                  </Button>
                </div>

                {apiTestResult && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">
                      API Test Result {apiTestResult.method && `(${apiTestResult.method})`}
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <Badge variant={apiTestResult.status === 200 ? "default" : "destructive"}>
                          {apiTestResult.status} {apiTestResult.statusText}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timestamp:</span>
                        <span className="text-gray-300 text-xs">{apiTestResult.timestamp}</span>
                      </div>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-64 bg-gray-800 p-3 rounded">
                      {JSON.stringify(apiTestResult.data || apiTestResult.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
