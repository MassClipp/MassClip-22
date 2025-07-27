"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Database,
  User,
  CreditCard,
  Clock,
  Key,
  Shield,
} from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface DebugData {
  timestamp: string
  user: {
    uid: string
    email: string | null
    emailVerified: boolean
    lastSignInTime: string | null
    creationTime: string | null
  }
  firestoreUserDoc: {
    exists: boolean
    data: any
    stripeFields: {
      stripeAccountId: string | null
      stripeAccessToken: string | null
      stripeRefreshToken: string | null
      stripeScope: string | null
      stripeConnectedAt: number | null
      stripeConnectionStatus: string | null
      stripeChargesEnabled: boolean
      stripePayoutsEnabled: boolean
      stripeDetailsSubmitted: boolean
      stripeAccountStatus: string | null
      updatedAt: any
      createdAt: any
    }
  }
  stripeAccountCheck: {
    success: boolean
    accountExists: boolean
    accountData: any
    error: string | null
  }
  oauthStates: {
    total: number
    recent: any[]
    expired: number
    used: number
  }
  connectionHistory: {
    hasHistory: boolean
    lastConnection: any
    connectionAttempts: any[]
  }
  systemChecks: {
    firebaseAuth: boolean
    firestoreConnection: boolean
    stripeApiConnection: boolean
    environmentVariables: {
      stripeSecretKey: boolean
      firebaseConfig: boolean
    }
  }
}

export default function DebugStripeConnectionLossPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !authLoading) {
      fetchDebugData()
    }
  }, [user, authLoading])

  const fetchDebugData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/debug/stripe-connection-loss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      setDebugData(data)
    } catch (err: any) {
      console.error("Debug fetch error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string | number | null) => {
    if (!timestamp) return "Never"
    const date = new Date(typeof timestamp === "string" ? timestamp : timestamp)
    return date.toLocaleString()
  }

  const getStatusIcon = (status: boolean | null) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusBadge = (status: boolean | null, trueText = "Yes", falseText = "No", nullText = "Unknown") => {
    if (status === true)
      return (
        <Badge variant="default" className="bg-green-500">
          {trueText}
        </Badge>
      )
    if (status === false) return <Badge variant="destructive">{falseText}</Badge>
    return <Badge variant="secondary">{nullText}</Badge>
  }

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to access the debug page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Connection Loss Debug</h1>
          <p className="text-muted-foreground">Comprehensive analysis of your Stripe connection status</p>
        </div>
        <Button onClick={fetchDebugData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Gathering debug information...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {debugData && (
        <div className="grid gap-6">
          {/* System Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>System Status Overview</span>
              </CardTitle>
              <CardDescription>Overall system health and connectivity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(debugData.systemChecks.firebaseAuth)}
                  <span className="text-sm">Firebase Auth</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(debugData.systemChecks.firestoreConnection)}
                  <span className="text-sm">Firestore</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(debugData.systemChecks.stripeApiConnection)}
                  <span className="text-sm">Stripe API</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(debugData.systemChecks.environmentVariables.stripeSecretKey)}
                  <span className="text-sm">Stripe Config</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Authentication Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>User Authentication</span>
              </CardTitle>
              <CardDescription>Current Firebase authentication status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="font-mono text-sm">{debugData.user.uid}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{debugData.user.email || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
                  <div className="mt-1">{getStatusBadge(debugData.user.emailVerified)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Sign In</label>
                  <p className="text-sm">{formatTimestamp(debugData.user.lastSignInTime)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                  <p className="text-sm">{formatTimestamp(debugData.user.creationTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Firestore User Document */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Firestore User Document</span>
              </CardTitle>
              <CardDescription>User profile data stored in Firestore</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Document Exists:</span>
                {getStatusBadge(debugData.firestoreUserDoc.exists)}
              </div>

              {debugData.firestoreUserDoc.exists && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Stripe-Related Fields</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Stripe Account ID</label>
                        <p className="font-mono text-sm break-all">
                          {debugData.firestoreUserDoc.stripeFields.stripeAccountId || "Not set"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Connection Status</label>
                        <p className="text-sm">
                          {debugData.firestoreUserDoc.stripeFields.stripeConnectionStatus || "Not set"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                        <p className="text-sm">
                          {debugData.firestoreUserDoc.stripeFields.stripeAccountStatus || "Not set"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Connected At</label>
                        <p className="text-sm">
                          {formatTimestamp(debugData.firestoreUserDoc.stripeFields.stripeConnectedAt)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Charges Enabled</label>
                        <div className="mt-1">
                          {getStatusBadge(debugData.firestoreUserDoc.stripeFields.stripeChargesEnabled)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Payouts Enabled</label>
                        <div className="mt-1">
                          {getStatusBadge(debugData.firestoreUserDoc.stripeFields.stripePayoutsEnabled)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Details Submitted</label>
                        <div className="mt-1">
                          {getStatusBadge(debugData.firestoreUserDoc.stripeFields.stripeDetailsSubmitted)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Has Access Token</label>
                        <div className="mt-1">
                          {getStatusBadge(!!debugData.firestoreUserDoc.stripeFields.stripeAccessToken)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Has Refresh Token</label>
                        <div className="mt-1">
                          {getStatusBadge(!!debugData.firestoreUserDoc.stripeFields.stripeRefreshToken)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">OAuth Scope</label>
                        <p className="text-sm">{debugData.firestoreUserDoc.stripeFields.stripeScope || "Not set"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Document Timestamps</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Created At</label>
                        <p className="text-sm">
                          {formatTimestamp(debugData.firestoreUserDoc.stripeFields.createdAt?.seconds * 1000)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                        <p className="text-sm">
                          {formatTimestamp(debugData.firestoreUserDoc.stripeFields.updatedAt?.seconds * 1000)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stripe Account Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Stripe Account Verification</span>
              </CardTitle>
              <CardDescription>Direct check with Stripe API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">API Call Success:</span>
                {getStatusBadge(debugData.stripeAccountCheck.success)}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Account Exists in Stripe:</span>
                {getStatusBadge(debugData.stripeAccountCheck.accountExists)}
              </div>

              {debugData.stripeAccountCheck.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{debugData.stripeAccountCheck.error}</AlertDescription>
                </Alert>
              )}

              {debugData.stripeAccountCheck.accountData && (
                <div>
                  <h4 className="font-medium mb-3">Stripe Account Data</h4>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(debugData.stripeAccountCheck.accountData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OAuth States */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>OAuth States</span>
              </CardTitle>
              <CardDescription>Recent OAuth connection attempts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total States</label>
                  <p className="text-2xl font-bold">{debugData.oauthStates.total}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expired</label>
                  <p className="text-2xl font-bold text-red-500">{debugData.oauthStates.expired}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Used</label>
                  <p className="text-2xl font-bold text-green-500">{debugData.oauthStates.used}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recent</label>
                  <p className="text-2xl font-bold">{debugData.oauthStates.recent.length}</p>
                </div>
              </div>

              {debugData.oauthStates.recent.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent OAuth States</h4>
                  <div className="space-y-2">
                    {debugData.oauthStates.recent.map((state: any, index: number) => (
                      <div key={index} className="bg-muted rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Created:</span> {formatTimestamp(state.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium">Used:</span> {state.used ? "Yes" : "No"}
                          </div>
                          <div>
                            <span className="font-medium">Expired:</span> {state.expired ? "Yes" : "No"}
                          </div>
                          <div>
                            <span className="font-medium">State ID:</span>
                            <span className="font-mono text-xs">{state.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Connection History</span>
              </CardTitle>
              <CardDescription>Historical connection attempts and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm font-medium">Has History:</span>
                {getStatusBadge(debugData.connectionHistory.hasHistory)}
              </div>

              {debugData.connectionHistory.lastConnection && (
                <div>
                  <h4 className="font-medium mb-3">Last Connection</h4>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(debugData.connectionHistory.lastConnection, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {debugData.connectionHistory.connectionAttempts.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-3">Recent Attempts</h4>
                  <div className="space-y-2">
                    {debugData.connectionHistory.connectionAttempts.map((attempt: any, index: number) => (
                      <div key={index} className="bg-muted rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium">Time:</span> {formatTimestamp(attempt.timestamp)}
                          <br />
                          <span className="font-medium">Status:</span> {attempt.status}
                          <br />
                          <span className="font-medium">Details:</span> {attempt.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw Debug Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Debug Data</CardTitle>
              <CardDescription>Complete debug information for technical analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-xs">{JSON.stringify(debugData, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
