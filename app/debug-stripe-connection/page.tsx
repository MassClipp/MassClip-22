"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Play, Bug, User, CreditCard, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface DiagnosticResult {
  name: string
  status: "success" | "error" | "warning" | "loading" | "pending"
  message: string
  details?: any
  timestamp?: string
}

interface StripeAccountDetails {
  id?: string
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
  requirements?: any
  business_type?: string
  country?: string
  created?: number
}

export default function DebugStripeConnectionPage() {
  const { user } = useAuth()
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showSensitive, setShowSensitive] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [stripeAccount, setStripeAccount] = useState<StripeAccountDetails | null>(null)

  const addDiagnostic = (diagnostic: DiagnosticResult) => {
    setDiagnostics((prev) => [...prev, { ...diagnostic, timestamp: new Date().toISOString() }])
  }

  const updateDiagnostic = (name: string, updates: Partial<DiagnosticResult>) => {
    setDiagnostics((prev) =>
      prev.map((d) => (d.name === name ? { ...d, ...updates, timestamp: new Date().toISOString() } : d)),
    )
  }

  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true)
    setDiagnostics([])
    setUserProfile(null)
    setStripeAccount(null)

    // Test 1: User Authentication
    addDiagnostic({
      name: "User Authentication",
      status: "loading",
      message: "Checking Firebase authentication...",
    })

    if (!user) {
      updateDiagnostic("User Authentication", {
        status: "error",
        message: "User not authenticated",
        details: { user: null },
      })
      setIsRunning(false)
      return
    }

    try {
      const idToken = await user.getIdToken()
      updateDiagnostic("User Authentication", {
        status: "success",
        message: `Authenticated as ${user.uid}`,
        details: {
          uid: user.uid,
          email: user.email,
          hasIdToken: !!idToken,
          tokenLength: idToken?.length || 0,
        },
      })
    } catch (error) {
      updateDiagnostic("User Authentication", {
        status: "error",
        message: "Failed to get ID token",
        details: { error: String(error) },
      })
    }

    // Test 2: NextAuth Session Check
    addDiagnostic({
      name: "NextAuth Session",
      status: "loading",
      message: "Checking NextAuth session...",
    })

    try {
      const sessionResponse = await fetch("/api/auth/session")
      const sessionData = await sessionResponse.json()

      if (sessionResponse.ok && sessionData?.user) {
        updateDiagnostic("NextAuth Session", {
          status: "success",
          message: `NextAuth session found for user ${sessionData.user.id}`,
          details: {
            userId: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name,
            sessionExists: true,
          },
        })
      } else {
        updateDiagnostic("NextAuth Session", {
          status: "error",
          message: "No NextAuth session found",
          details: { sessionData, status: sessionResponse.status },
        })
      }
    } catch (error) {
      updateDiagnostic("NextAuth Session", {
        status: "error",
        message: "Failed to check NextAuth session",
        details: { error: String(error) },
      })
    }

    // Test 3: User Profile Lookup
    addDiagnostic({
      name: "User Profile Lookup",
      status: "loading",
      message: "Checking user profile in Firestore...",
    })

    try {
      const profileResponse = await fetch("/api/debug/user-profile-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      const profileData = await profileResponse.json()

      if (profileResponse.ok) {
        setUserProfile(profileData.profile)
        updateDiagnostic("User Profile Lookup", {
          status: "success",
          message: `User profile found with ${profileData.profile?.stripeAccountId ? "Stripe account ID" : "NO Stripe account ID"}`,
          details: {
            profileExists: profileData.exists,
            hasStripeAccountId: !!profileData.profile?.stripeAccountId,
            stripeAccountId: profileData.profile?.stripeAccountId,
            profileFields: Object.keys(profileData.profile || {}),
          },
        })
      } else {
        updateDiagnostic("User Profile Lookup", {
          status: "error",
          message: profileData.error || "Failed to lookup user profile",
          details: profileData,
        })
      }
    } catch (error) {
      updateDiagnostic("User Profile Lookup", {
        status: "error",
        message: "Network error during profile lookup",
        details: { error: String(error) },
      })
    }

    // Test 4: Stripe Environment Check
    addDiagnostic({
      name: "Stripe Environment",
      status: "loading",
      message: "Checking Stripe configuration...",
    })

    try {
      const stripeEnvResponse = await fetch("/api/debug/stripe-environment")
      const stripeEnvData = await stripeEnvResponse.json()

      updateDiagnostic("Stripe Environment", {
        status: stripeEnvData.configured ? "success" : "error",
        message: stripeEnvData.configured ? "Stripe environment configured" : "Stripe environment issues",
        details: stripeEnvData,
      })
    } catch (error) {
      updateDiagnostic("Stripe Environment", {
        status: "error",
        message: "Failed to check Stripe environment",
        details: { error: String(error) },
      })
    }

    // Test 5: Direct Stripe Account Lookup
    if (userProfile?.stripeAccountId) {
      addDiagnostic({
        name: "Stripe Account Lookup",
        status: "loading",
        message: "Fetching account details from Stripe...",
      })

      try {
        const stripeAccountResponse = await fetch("/api/debug/stripe-account-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: userProfile.stripeAccountId }),
        })

        const stripeAccountData = await stripeAccountResponse.json()

        if (stripeAccountResponse.ok) {
          setStripeAccount(stripeAccountData.account)
          updateDiagnostic("Stripe Account Lookup", {
            status: "success",
            message: "Stripe account retrieved successfully",
            details: {
              accountId: stripeAccountData.account.id,
              charges_enabled: stripeAccountData.account.charges_enabled,
              payouts_enabled: stripeAccountData.account.payouts_enabled,
              details_submitted: stripeAccountData.account.details_submitted,
              requirements: stripeAccountData.account.requirements,
              business_type: stripeAccountData.account.business_type,
              country: stripeAccountData.account.country,
            },
          })
        } else {
          updateDiagnostic("Stripe Account Lookup", {
            status: "error",
            message: stripeAccountData.error || "Failed to retrieve Stripe account",
            details: stripeAccountData,
          })
        }
      } catch (error) {
        updateDiagnostic("Stripe Account Lookup", {
          status: "error",
          message: "Network error during Stripe account lookup",
          details: { error: String(error) },
        })
      }
    }

    // Test 6: Full Account Status API Test
    addDiagnostic({
      name: "Account Status API",
      status: "loading",
      message: "Testing the full account status endpoint...",
    })

    try {
      const statusResponse = await fetch("/api/stripe/account-status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      const statusText = await statusResponse.text()
      let statusData

      try {
        statusData = JSON.parse(statusText)
      } catch {
        statusData = { rawResponse: statusText }
      }

      updateDiagnostic("Account Status API", {
        status: statusResponse.ok ? "success" : "error",
        message: statusResponse.ok
          ? "Account status API working correctly"
          : `Account status API failed with ${statusResponse.status}`,
        details: {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          headers: Object.fromEntries(statusResponse.headers.entries()),
          response: statusData,
        },
      })
    } catch (error) {
      updateDiagnostic("Account Status API", {
        status: "error",
        message: "Network error calling account status API",
        details: { error: String(error) },
      })
    }

    // Test 7: Fixed Account Status API Test (using Firebase auth)
    addDiagnostic({
      name: "Fixed Account Status API",
      status: "loading",
      message: "Testing the fixed account status endpoint with Firebase auth...",
    })

    try {
      const idToken = await user.getIdToken()
      const statusResponse = await fetch(`/api/stripe/account-status-fixed?userId=${user.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const statusText = await statusResponse.text()
      let statusData

      try {
        statusData = JSON.parse(statusText)
      } catch {
        statusData = { rawResponse: statusText }
      }

      updateDiagnostic("Fixed Account Status API", {
        status: statusResponse.ok ? "success" : "error",
        message: statusResponse.ok
          ? "Fixed account status API working correctly!"
          : `Fixed account status API failed with ${statusResponse.status}`,
        details: {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          headers: Object.fromEntries(statusResponse.headers.entries()),
          response: statusData,
        },
      })
    } catch (error) {
      updateDiagnostic("Fixed Account Status API", {
        status: "error",
        message: "Network error calling fixed account status API",
        details: { error: String(error) },
      })
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "loading":
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "loading":
        return <Badge variant="secondary">Running...</Badge>
      case "pending":
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const formatJson = (obj: any) => {
    if (typeof obj === "string") return obj
    return JSON.stringify(obj, null, 2)
  }

  const maskSensitiveData = (key: string, value: any) => {
    const sensitiveKeys = ["token", "key", "secret", "password", "idToken"]
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      if (typeof value === "string" && value.length > 10) {
        return showSensitive ? value : `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      }
    }
    return value
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stripe Connection Debug Console</h1>
        <p className="text-zinc-400 mt-1">Comprehensive diagnostics for Stripe integration issues</p>
      </div>

      <Tabs defaultValue="diagnostics">
        <TabsList>
          <TabsTrigger value="diagnostics">System Diagnostics</TabsTrigger>
          <TabsTrigger value="profile">User Profile</TabsTrigger>
          <TabsTrigger value="stripe">Stripe Account</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    Comprehensive Diagnostics
                  </CardTitle>
                  <CardDescription>Run all tests to identify the root cause of connection issues</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSensitive(!showSensitive)}>
                    {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showSensitive ? "Hide" : "Show"} Sensitive
                  </Button>
                  <Button
                    onClick={runComprehensiveDiagnostics}
                    disabled={isRunning}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isRunning ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Full Diagnostics
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {diagnostics.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  Click "Run Full Diagnostics" to start comprehensive testing
                </div>
              ) : (
                <div className="space-y-4">
                  {diagnostics.map((diagnostic, index) => (
                    <div key={index} className="border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(diagnostic.status)}
                          <h3 className="font-medium">{diagnostic.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(diagnostic.status)}
                          {diagnostic.timestamp && (
                            <span className="text-xs text-zinc-500">
                              {new Date(diagnostic.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{diagnostic.message}</p>
                      {diagnostic.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 mb-2">
                            View Technical Details
                          </summary>
                          <pre className="p-3 bg-zinc-800 rounded text-zinc-300 overflow-auto max-h-96">
                            {formatJson(
                              typeof diagnostic.details === "object"
                                ? Object.fromEntries(
                                    Object.entries(diagnostic.details).map(([k, v]) => [k, maskSensitiveData(k, v)]),
                                  )
                                : diagnostic.details,
                            )}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile Analysis
              </CardTitle>
              <CardDescription>Current user profile and Stripe connection data</CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="text-center py-8 text-zinc-500">Please log in to view profile information</div>
              ) : !userProfile ? (
                <div className="text-center py-8 text-zinc-500">Run diagnostics to load user profile data</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Firebase UID</label>
                      <div className="text-sm font-mono bg-zinc-800 p-2 rounded">{user.uid}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Email</label>
                      <div className="text-sm bg-zinc-800 p-2 rounded">{user.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Stripe Account ID</label>
                      <div className="text-sm font-mono bg-zinc-800 p-2 rounded">
                        {userProfile.stripeAccountId || "Not connected"}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Profile Created</label>
                      <div className="text-sm bg-zinc-800 p-2 rounded">
                        {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleString() : "Unknown"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-2 block">Full Profile Data</label>
                    <pre className="p-3 bg-zinc-800 rounded text-zinc-300 overflow-auto max-h-96 text-xs">
                      {formatJson(
                        Object.fromEntries(Object.entries(userProfile).map(([k, v]) => [k, maskSensitiveData(k, v)])),
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Account Details
              </CardTitle>
              <CardDescription>Direct Stripe account information and capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              {!stripeAccount ? (
                <div className="text-center py-8 text-zinc-500">Run diagnostics to load Stripe account data</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-zinc-800 rounded-lg">
                      <div
                        className={`text-2xl mb-2 ${stripeAccount.charges_enabled ? "text-green-400" : "text-red-400"}`}
                      >
                        {stripeAccount.charges_enabled ? "✅" : "❌"}
                      </div>
                      <div className="text-sm font-medium">Charges Enabled</div>
                    </div>
                    <div className="text-center p-4 bg-zinc-800 rounded-lg">
                      <div
                        className={`text-2xl mb-2 ${stripeAccount.payouts_enabled ? "text-green-400" : "text-red-400"}`}
                      >
                        {stripeAccount.payouts_enabled ? "✅" : "❌"}
                      </div>
                      <div className="text-sm font-medium">Payouts Enabled</div>
                    </div>
                    <div className="text-center p-4 bg-zinc-800 rounded-lg">
                      <div
                        className={`text-2xl mb-2 ${stripeAccount.details_submitted ? "text-green-400" : "text-yellow-400"}`}
                      >
                        {stripeAccount.details_submitted ? "✅" : "⏳"}
                      </div>
                      <div className="text-sm font-medium">Details Submitted</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Account ID</label>
                      <div className="text-sm font-mono bg-zinc-800 p-2 rounded">{stripeAccount.id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Business Type</label>
                      <div className="text-sm bg-zinc-800 p-2 rounded">{stripeAccount.business_type || "Not set"}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Country</label>
                      <div className="text-sm bg-zinc-800 p-2 rounded">{stripeAccount.country || "Not set"}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Created</label>
                      <div className="text-sm bg-zinc-800 p-2 rounded">
                        {stripeAccount.created ? new Date(stripeAccount.created * 1000).toLocaleString() : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {stripeAccount.requirements && (
                    <div>
                      <label className="text-sm font-medium text-zinc-400 mb-2 block">Requirements</label>
                      <div className="space-y-2">
                        {stripeAccount.requirements.currently_due?.length > 0 && (
                          <div className="p-3 bg-red-900/20 border border-red-800/50 rounded">
                            <h4 className="font-medium text-red-300 mb-1">Currently Due</h4>
                            <ul className="text-sm text-red-200 space-y-1">
                              {stripeAccount.requirements.currently_due.map((req: string, i: number) => (
                                <li key={i}>• {req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {stripeAccount.requirements.past_due?.length > 0 && (
                          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded">
                            <h4 className="font-medium text-red-300 mb-1">Past Due</h4>
                            <ul className="text-sm text-red-200 space-y-1">
                              {stripeAccount.requirements.past_due.map((req: string, i: number) => (
                                <li key={i}>• {req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {stripeAccount.requirements.eventually_due?.length > 0 && (
                          <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded">
                            <h4 className="font-medium text-yellow-300 mb-1">Eventually Due</h4>
                            <ul className="text-sm text-yellow-200 space-y-1">
                              {stripeAccount.requirements.eventually_due.map((req: string, i: number) => (
                                <li key={i}>• {req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-2 block">Full Account Data</label>
                    <pre className="p-3 bg-zinc-800 rounded text-zinc-300 overflow-auto max-h-96 text-xs">
                      {formatJson(stripeAccount)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
