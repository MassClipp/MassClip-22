"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, XCircle, AlertCircle, Info, Copy, RefreshCw, User, ExternalLink } from "lucide-react"
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { app } from "@/firebase/firebase"

interface AccountInfo {
  id: string
  email: string | null
  country: string | null
  type: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  livemode: boolean
  requirementsCount: number
  currentlyDue: string[]
  pastDue: string[]
  rawAccount?: any
}

interface ConnectionStatus {
  success: boolean
  isConnected: boolean
  accountId: string | null
  mode: string
  accountStatus?: any
  message: string
  error?: string
}

export default function ManualStripeConnect() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [accountId, setAccountId] = useState("")
  const [validatedAccount, setValidatedAccount] = useState<AccountInfo | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState("")

  // Monitor authentication state
  useEffect(() => {
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user")
      setUser(user)
      setAuthLoading(false)
      if (user) {
        checkConnectionStatus(user)
      } else {
        setConnectionStatus({
          success: true,
          isConnected: false,
          accountId: null,
          mode: "test",
          message: "User not authenticated",
        })
      }
    })

    return () => unsubscribe()
  }, [])

  const checkConnectionStatus = async (currentUser?: FirebaseUser) => {
    try {
      const authUser = currentUser || user
      if (!authUser) {
        setConnectionStatus({
          success: true,
          isConnected: false,
          accountId: null,
          mode: "test",
          message: "User not authenticated",
        })
        return
      }

      const idToken = await authUser.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      setConnectionStatus(data)
      console.log("Connection status:", data)
    } catch (error) {
      console.error("Failed to check connection status:", error)
      setConnectionStatus({
        success: false,
        isConnected: false,
        accountId: null,
        mode: "test",
        message: "Failed to check connection status",
      })
    }
  }

  const validateAccount = async () => {
    if (!accountId.trim()) {
      setError("Please enter an account ID")
      return
    }

    setValidating(true)
    setError("")
    setValidatedAccount(null)

    try {
      const response = await fetch("/api/stripe/connect/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountId.trim() }),
      })

      const data = await response.json()

      if (data.success && data.account) {
        setValidatedAccount(data.account)
        toast({
          title: "Account Validated ✅",
          description: `Account ${data.account.id} is valid and ready to connect`,
        })
      } else {
        setError(data.error || "Failed to validate account")
        toast({
          title: "Validation Failed",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Validation error:", error)
      setError("Network error during validation")
      toast({
        title: "Validation Error",
        description: "Failed to validate account",
        variant: "destructive",
      })
    } finally {
      setValidating(false)
    }
  }

  const connectAccount = async () => {
    if (!validatedAccount || !user) return

    setConnecting(true)
    try {
      const idToken = await user.getIdToken(true)
      const response = await fetch("/api/stripe/connect/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          accountId: validatedAccount.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.requiresOnboarding && data.onboardingUrl) {
          toast({
            title: "Onboarding Required",
            description: "Account found but needs to complete onboarding process",
          })

          // Open onboarding URL in new tab
          window.open(data.onboardingUrl, "_blank")
        } else {
          toast({
            title: "Connected Successfully! 🎉",
            description: `Account ${data.accountId} is now connected to MassClip`,
          })
        }

        // Reset form and refresh status
        setAccountId("")
        setValidatedAccount(null)
        await checkConnectionStatus()
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect account",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Connection error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect account",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  const startOnboarding = async () => {
    if (!user) return

    setLoading(true)
    try {
      const idToken = await user.getIdToken(true)
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      if (data.success && data.onboardingUrl) {
        toast({
          title: "Starting Onboarding",
          description: "Opening Stripe onboarding in new tab",
        })

        // Open onboarding URL in new tab
        window.open(data.onboardingUrl, "_blank")
      } else {
        toast({
          title: "Onboarding Failed",
          description: data.error || "Failed to start onboarding",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Onboarding error:", error)
      toast({
        title: "Onboarding Error",
        description: "Failed to start onboarding",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyAccountId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast({
      title: "Copied!",
      description: "Account ID copied to clipboard",
    })
  }

  const handleInputChange = (value: string) => {
    setAccountId(value)
    setError("")
    setValidatedAccount(null)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Authentication Status */}
      <Alert className={user ? "border-green-600 bg-green-600/10" : "border-red-600 bg-red-600/10"}>
        {user ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Authentication:</strong> {user ? `Logged in as ${user.email}` : "Not authenticated"}
              {user && <div className="text-xs text-muted-foreground mt-1">User ID: {user.uid}</div>}
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <Badge variant="outline">Authenticated</Badge>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Connection Status */}
      {connectionStatus && (
        <Alert
          className={
            connectionStatus.isConnected ? "border-green-600 bg-green-600/10" : "border-yellow-600 bg-yellow-600/10"
          }
        >
          {connectionStatus.isConnected ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Status:</strong> {connectionStatus.message}
                {connectionStatus.accountId && (
                  <div className="mt-1">
                    <span className="font-mono text-sm">{connectionStatus.accountId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-6 w-6 p-0"
                      onClick={() => copyAccountId(connectionStatus.accountId!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => checkConnectionStatus()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!user && (
        <Alert className="border-yellow-600 bg-yellow-600/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Authentication Required:</strong> Please log in to connect your Stripe account. You can use the
            login form or navigate to the authentication page.
          </AlertDescription>
        </Alert>
      )}

      {/* Automatic Onboarding Option */}
      {user && !connectionStatus?.isConnected && (
        <Card className="max-w-2xl border-blue-600/20">
          <CardHeader>
            <h3 className="text-lg font-semibold">Automatic Setup (Recommended)</h3>
            <p className="text-sm text-muted-foreground">
              Let Stripe guide you through creating and connecting a new account
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={startOnboarding} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Onboarding...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Start Stripe Onboarding
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <h3 className="text-xl font-semibold">Manual Stripe Connect</h3>
          <p className="text-sm text-muted-foreground">
            Connect an existing Stripe account by entering its account ID directly
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Info Alert */}
          <Alert className="border-blue-600 bg-blue-600/10">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Mode:</strong> Only test accounts can be connected in test mode. Find your account ID in
              Stripe Dashboard → Settings → Account details.
            </AlertDescription>
          </Alert>

          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="accountId">Stripe Account ID</Label>
            <div className="flex gap-2">
              <Input
                id="accountId"
                placeholder="acct_1234567890abcdef"
                value={accountId}
                onChange={(e) => handleInputChange(e.target.value)}
                className="font-mono"
                disabled={!user || validating || connecting}
              />
              <Button
                onClick={validateAccount}
                disabled={!user || !accountId.trim() || validating || connecting}
                variant="outline"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-600 bg-red-600/10">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Validated Account Info */}
          {validatedAccount && (
            <div className="space-y-4">
              <Alert className="border-green-600 bg-green-600/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Account Validated:</strong> Ready to connect to MassClip platform
                </AlertDescription>
              </Alert>

              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Account ID</div>
                    <div className="font-mono text-sm">{validatedAccount.id}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyAccountId(validatedAccount.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <Badge variant="outline">{validatedAccount.type}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Country</div>
                    <div className="text-sm">{validatedAccount.country}</div>
                  </div>
                </div>

                {validatedAccount.email && (
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm">{validatedAccount.email}</div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="flex items-center justify-center mb-1">
                      {validatedAccount.chargesEnabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-xs">Charges</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="flex items-center justify-center mb-1">
                      {validatedAccount.payoutsEnabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-xs">Payouts</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="flex items-center justify-center mb-1">
                      {validatedAccount.detailsSubmitted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="text-xs">Details</div>
                  </div>
                </div>

                {validatedAccount.requirementsCount > 0 && (
                  <Alert className="border-yellow-600 bg-yellow-600/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This account has {validatedAccount.requirementsCount} pending requirements.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="bg-muted/20 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Debug Information</h4>
              <Button variant="ghost" size="sm" onClick={() => checkConnectionStatus()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <strong>Status:</strong> {connectionStatus?.isConnected ? "Connected" : "Not Connected"}
              </div>
              <div>
                <strong>Mode:</strong> {connectionStatus?.mode || "test"}
              </div>
              <div>
                <strong>Message:</strong>
              </div>
              <div className="text-muted-foreground">{connectionStatus?.message || "Loading..."}</div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          {validatedAccount && user && (
            <Button onClick={connectAccount} disabled={connecting} className="w-full" size="lg">
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting Account...
                </>
              ) : (
                "Connect to MassClip Platform"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
