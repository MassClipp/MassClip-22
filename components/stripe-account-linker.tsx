"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Link, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface StripeAccountLinkerProps {
  onSuccess?: () => void
}

export default function StripeAccountLinker({ onSuccess }: StripeAccountLinkerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [accountId, setAccountId] = useState("")
  const [linking, setLinking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLinkAccount = async () => {
    if (!accountId.trim()) {
      setError("Please enter a Stripe account ID")
      return
    }

    if (!user) {
      setError("You must be logged in to link a Stripe account")
      return
    }

    setLinking(true)
    setError(null)

    try {
      console.log("🔗 Starting account linking process...")

      // Get Firebase auth token
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          stripeAccountId: accountId.trim(),
          idToken,
        }),
      })

      const data = await response.json()

      if (data.success) {
        console.log("✅ Account linked successfully:", data)
        setSuccess(true)
        toast({
          title: "Account Linked Successfully",
          description: `Stripe account ${accountId} has been connected to your profile.`,
        })

        if (onSuccess) {
          onSuccess()
        }
      } else {
        console.error("❌ Linking failed:", data)
        setError(data.error || "Failed to link Stripe account")
        toast({
          title: "Linking Failed",
          description: data.error || "Failed to link Stripe account",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Network error:", error)
      setError("Network error - please try again")
      toast({
        title: "Network Error",
        description: "Failed to communicate with the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLinking(false)
    }
  }

  const handleCreateNew = () => {
    window.open("https://dashboard.stripe.com/register", "_blank")
  }

  if (success) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Account Linked Successfully!</h3>
              <p className="text-zinc-400">
                Your Stripe account <code className="bg-zinc-800 px-2 py-1 rounded text-green-400">{accountId}</code>{" "}
                has been connected.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-700 text-white">
              Continue to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create New Account */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <ExternalLink className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Create New Stripe Account</CardTitle>
              <CardDescription className="text-zinc-400">
                Set up a new Stripe account to start accepting payments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Quick 5-minute setup</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>2.9% + 30¢ per transaction</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Automatic payouts to your bank</span>
            </div>
          </div>
          <Button onClick={handleCreateNew} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <ExternalLink className="h-4 w-4 mr-2" />
            Create Stripe Account
          </Button>
          <p className="text-xs text-zinc-500 text-center">After creating your account, return here to link it</p>
        </CardContent>
      </Card>

      {/* Link Existing Account */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Link className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Link Existing Account</CardTitle>
              <CardDescription className="text-zinc-400">Connect your existing Stripe account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-600/50 bg-red-600/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="accountId" className="text-sm font-medium text-zinc-300">
              Stripe Account ID
            </label>
            <Input
              id="accountId"
              type="text"
              placeholder="acct_1234567890"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              disabled={linking}
            />
            <p className="text-xs text-zinc-500">Find this in your Stripe Dashboard → Settings → Account</p>
          </div>

          <Button
            onClick={handleLinkAccount}
            disabled={linking || !accountId.trim() || !user}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {linking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking Account...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Link Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
