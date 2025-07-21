"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface AccountDetails {
  id: string
  type: string
  country: string
  email?: string
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  created: number
  business_type?: string
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  capabilities?: Record<string, any>
}

interface TestResult {
  success: boolean
  message: string
  details?: any
  suggestions?: string[]
}

interface DebugResults {
  accountDetails?: AccountDetails
  linkResult?: TestResult
  stripeEnvironment?: any
  error?: string
  comprehensiveCheck?: any
}

export default function DebugStripeLinkPage() {
  const { user } = useFirebaseAuth()
  const [accountId, setAccountId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DebugResults>({})

  const testAccountLink = async () => {
    if (!user || !accountId.trim()) {
      setResults({ error: "Please enter a valid Stripe account ID" })
      return
    }

    if (!accountId.startsWith("acct_")) {
      setResults({ error: "Stripe account ID must start with 'acct_'" })
      return
    }

    setIsLoading(true)
    setResults({})

    try {
      console.log("🔍 [Debug] Getting ID token...")
      const token = await user.getIdToken(true)
      console.log("🎫 [Debug] Token obtained, length:", token.length)

      console.log("🔍 [Debug] Testing account link...")
      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stripeAccountId: accountId.trim(),
        }),
      })

      const data = await response.json()
      console.log("📡 [Debug] Response:", data)

      if (response.ok) {
        setResults({
          accountDetails: data.accountDetails,
          linkResult: {
            success: true,
            message: "Account linked successfully!",
            details: data,
          },
        })
      } else {
        setResults({
          linkResult: {
            success: false,
            message: data.error || `Failed to link account (${response.status})`,
            details: data.details,
            suggestions: data.suggestions,
          },
        })
      }
    } catch (error: any) {
      console.error("❌ [Debug] Error:", error)
      setResults({
        error: `Network error: ${error.message}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getAccountInfo = async () => {
    if (!accountId.trim() || !accountId.startsWith("acct_")) {
      return
    }

    try {
      const response = await fetch("/api/debug/stripe-account-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountId.trim(),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setResults((prev) => ({
          ...prev,
          accountDetails: data.account,
        }))
      }
    } catch (error) {
      console.error("Failed to get account info:", error)
    }
  }

  const checkStripeEnvironment = async () => {
    try {
      const response = await fetch("/api/debug/stripe-environment")
      const data = await response.json()
      setResults((prev) => ({
        ...prev,
        stripeEnvironment: data,
      }))
    } catch (error) {
      console.error("Failed to get Stripe environment:", error)
    }
  }

  const runComprehensiveCheck = async () => {
    if (!accountId.trim() || !accountId.startsWith("acct_")) {
      setResults({ error: "Please enter a valid Stripe account ID" })
      return
    }

    setIsLoading(true)
    setResults({})

    try {
      const response = await fetch("/api/debug/stripe-account-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountId.trim(),
        }),
      })

      const data = await response.json()
      setResults((prev) => ({
        ...prev,
        comprehensiveCheck: data,
      }))
    } catch (error: any) {
      console.error("Failed to run comprehensive check:", error)
      setResults({ error: `Failed to run comprehensive check: ${error.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  const renderAccountDetails = (account: AccountDetails) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Account Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Account ID</Label>
            <p className="text-sm text-muted-foreground font-mono">{account.id}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Type</Label>
            <Badge variant="outline">{account.type}</Badge>
          </div>
          <div>
            <Label className="text-sm font-medium">Country</Label>
            <p className="text-sm text-muted-foreground">{account.country}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Business Type</Label>
            <p className="text-sm text-muted-foreground">{account.business_type || "Not specified"}</p>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-medium mb-2 block">Account Status</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {account.details_submitted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Details Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              {account.charges_enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Charges Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              {account.payouts_enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Payouts Enabled</span>
            </div>
          </div>
        </div>

        {account.requirements && (
          <>
            <Separator />
            <div>
              <Label className="text-sm font-medium mb-2 block">Requirements</Label>
              <div className="space-y-2">
                {account.requirements.currently_due.length > 0 && (
                  <div>
                    <Badge variant="destructive" className="mb-1">
                      Currently Due
                    </Badge>
                    <ul className="text-sm text-muted-foreground ml-4">
                      {account.requirements.currently_due.map((req, i) => (
                        <li key={i}>• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {account.requirements.pending_verification.length > 0 && (
                  <div>
                    <Badge variant="secondary" className="mb-1">
                      Pending Verification
                    </Badge>
                    <ul className="text-sm text-muted-foreground ml-4">
                      {account.requirements.pending_verification.map((req, i) => (
                        <li key={i}>• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <Label className="text-sm font-medium">Created</Label>
          <p className="text-sm text-muted-foreground">{new Date(account.created * 1000).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )

  const renderTestResult = (result: TestResult) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          Link Test Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>

        {result.details && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Details</Label>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(result.details, null, 2)}</pre>
          </div>
        )}

        {result.suggestions && result.suggestions.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Suggestions</Label>
            <ul className="text-sm space-y-1">
              {result.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderComprehensiveCheck = (check: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Comprehensive Account Check
        </CardTitle>
        <CardDescription>Detailed analysis of account status and platform compatibility</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(check.checks).map(([checkName, checkResult]: [string, any]) => (
          <div key={checkName} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {checkResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <Label className="font-medium capitalize">{checkName.replace(/([A-Z])/g, " $1")}</Label>
            </div>

            <p className="text-sm text-muted-foreground mb-2">{checkResult.message}</p>

            {checkResult.error && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription>
                  <strong>Error:</strong> {checkResult.error}
                  {checkResult.code && (
                    <span className="block mt-1">
                      <strong>Code:</strong> {checkResult.code}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {checkResult.suggestions && (
              <div className="mt-2">
                <Label className="text-xs font-medium">Suggestions:</Label>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  {checkResult.suggestions.map((suggestion: string, i: number) => (
                    <li key={i}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {checkResult.details && (
              <details className="mt-2">
                <summary className="text-xs font-medium cursor-pointer">View Details</summary>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(checkResult.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Stripe Account Linking</h1>
        <p className="text-muted-foreground">Test and debug Stripe account linking with detailed error information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Account Link</CardTitle>
          <CardDescription>Enter a Stripe account ID to test the linking process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountId">Stripe Account ID</Label>
            <Input
              id="accountId"
              placeholder="acct_1234567890"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Find your account ID in your Stripe dashboard under Settings → Account details
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={testAccountLink} disabled={isLoading || !accountId.trim() || !user}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Account Link"
              )}
            </Button>
            <Button variant="outline" onClick={getAccountInfo} disabled={!accountId.trim()}>
              Get Account Info
            </Button>
            <Button onClick={runComprehensiveCheck} disabled={isLoading || !accountId.trim()} variant="secondary">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Checks...
                </>
              ) : (
                "Run Comprehensive Check"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Environment Check</CardTitle>
          <CardDescription>Check your current Stripe configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkStripeEnvironment} variant="outline" className="w-full bg-transparent">
            Check Stripe Environment
          </Button>

          {results.stripeEnvironment && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Mode</Label>
                  <Badge variant={results.stripeEnvironment.isTestMode ? "secondary" : "default"}>
                    {results.stripeEnvironment.isTestMode ? "TEST" : "LIVE"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Environment</Label>
                  <p className="text-sm text-muted-foreground">{results.stripeEnvironment.nodeEnv}</p>
                </div>
              </div>

              {results.stripeEnvironment.keyInfo && (
                <div>
                  <Label className="text-sm font-medium">API Key Info</Label>
                  <p className="text-xs text-muted-foreground font-mono">{results.stripeEnvironment.keyInfo}</p>
                </div>
              )}

              {results.stripeEnvironment.warning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{results.stripeEnvironment.warning}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {results.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{results.error}</AlertDescription>
        </Alert>
      )}

      {results.accountDetails && renderAccountDetails(results.accountDetails)}
      {results.linkResult && renderTestResult(results.linkResult)}
      {results.comprehensiveCheck && renderComprehensiveCheck(results.comprehensiveCheck)}
    </div>
  )
}
