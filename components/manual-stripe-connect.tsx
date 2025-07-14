"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle, Search, Link, Info, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AccountInfo {
  id: string
  type: string
  country: string
  email?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  livemode: boolean
  requirementsCount: number
}

export default function ManualStripeConnect() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [accountId, setAccountId] = useState("")
  const [validating, setValidating] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [validationError, setValidationError] = useState("")
  const [connected, setConnected] = useState(false)

  const validateAccount = async () => {
    if (!accountId.trim()) {
      setValidationError("Please enter an account ID")
      return
    }

    setValidating(true)
    setValidationError("")
    setAccountInfo(null)

    try {
      const response = await fetch("/api/stripe/connect/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: accountId.trim() }),
      })

      const data = await response.json()

      if (data.valid) {
        setAccountInfo(data.accountInfo)
        toast({
          title: "Account Validated",
          description: "Account is valid and ready to connect",
        })
      } else {
        setValidationError(data.error)
        setAccountInfo(null)
      }
    } catch (error: any) {
      console.error("Validation error:", error)
      setValidationError("Failed to validate account")
    } finally {
      setValidating(false)
    }
  }

  const connectAccount = async () => {
    if (!user || !accountInfo) return

    setConnecting(true)
    try {
      const token = await user.getIdToken(true)
      const response = await fetch("/api/stripe/connect/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
          accountId: accountInfo.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setConnected(true)
        toast({
          title: "Success!",
          description: "Account successfully connected to MassClip platform",
        })
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
        title: "Error",
        description: "Failed to connect account",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  const copyAccountId = () => {
    if (accountInfo?.id) {
      navigator.clipboard.writeText(accountInfo.id)
      toast({
        title: "Copied",
        description: "Account ID copied to clipboard",
      })
    }
  }

  const handleInputChange = (value: string) => {
    setAccountId(value)
    setValidationError("")
    setAccountInfo(null)
    setConnected(false)
  }

  if (!user) {
    return (
      <Alert className="border-yellow-600 bg-yellow-600/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Authentication Required:</strong> Please log in to connect your Stripe account.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Manual Account Connection
        </CardTitle>
        <CardDescription>Connect an existing Stripe account by entering its account ID directly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert className="border-blue-600 bg-blue-600/10">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Mode:</strong> Only test accounts (acct_test_...) can be connected in test mode. You can find
            your account ID in your Stripe dashboard under Settings → Account details.
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
              disabled={validating || connecting}
            />
            <Button
              onClick={validateAccount}
              disabled={!accountId.trim() || validating || connecting}
              variant="outline"
            >
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <Alert className="border-red-600 bg-red-600/10">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Validation Error:</strong> {validationError}
            </AlertDescription>
          </Alert>
        )}

        {/* Account Info */}
        {accountInfo && (
          <div className="space-y-4">
            <Alert className="border-green-600 bg-green-600/10">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Account Validated:</strong> Ready to connect to MassClip platform
              </AlertDescription>
            </Alert>

            <div className="bg-zinc-800/30 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400">Account ID</div>
                  <div className="font-mono text-sm">{accountInfo.id}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={copyAccountId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-400">Type</div>
                  <Badge variant="outline" className="text-xs">
                    {accountInfo.type}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Country</div>
                  <div className="text-sm">{accountInfo.country}</div>
                </div>
              </div>

              {accountInfo.email && (
                <div>
                  <div className="text-xs text-zinc-400">Email</div>
                  <div className="text-sm">{accountInfo.email}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                  <div className="flex items-center justify-center mb-1">
                    {accountInfo.chargesEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs">Charges</div>
                </div>
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                  <div className="flex items-center justify-center mb-1">
                    {accountInfo.payoutsEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs">Payouts</div>
                </div>
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                  <div className="flex items-center justify-center mb-1">
                    {accountInfo.detailsSubmitted ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-xs">Details</div>
                </div>
              </div>

              {accountInfo.requirementsCount > 0 && (
                <Alert className="border-yellow-600 bg-yellow-600/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This account has {accountInfo.requirementsCount} pending requirements that may need to be completed.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {!connected && (
              <Button onClick={connectAccount} disabled={connecting} className="w-full" size="lg">
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting Account...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Connect to MassClip Platform
                  </>
                )}
              </Button>
            )}

            {connected && (
              <Alert className="border-green-600 bg-green-600/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Connected!</strong> Account successfully connected to MassClip platform.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
