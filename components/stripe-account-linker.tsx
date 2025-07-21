"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LinkIcon, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface StripeAccountLinkerProps {
  onSuccess?: () => void
}

export function StripeAccountLinker({ onSuccess }: StripeAccountLinkerProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [accountId, setAccountId] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkAccount = async () => {
    if (!accountId.trim()) return
    setLoading(true)
    setError(null)

    try {
      // Get ID token for authentication
      let idToken = null
      if (user) {
        try {
          // @ts-ignore - Firebase user has getIdToken method
          idToken = await user.getIdToken()
        } catch (tokenError) {
          console.warn("Could not get ID token:", tokenError)
        }
      }

      const res = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          stripeAccountId: accountId.trim(),
          ...(idToken && { idToken }),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        toast({
          title: "Success!",
          description: "Stripe account linked successfully",
        })
        onSuccess?.()
      } else {
        setError(data.error ?? "Unknown error occurred")
        toast({
          title: "Error",
          description: data.error ?? "Failed to link account",
          variant: "destructive",
        })
      }
    } catch (fetchError: any) {
      console.error("Link account error:", fetchError)
      setError("Network error - please try again")
      toast({
        title: "Error",
        description: "Network error - please try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = () => {
    window.open("https://dashboard.stripe.com/register", "_blank")
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-16 w-16 text-green-400" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-green-300">Account Linked Successfully!</h3>
          <p className="text-sm text-muted-foreground">
            Your Stripe account is now connected and ready to accept payments.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Connect Your Stripe Account</h2>
        <p className="text-sm text-muted-foreground">Enter your Stripe account ID to start accepting payments</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="accountId" className="text-sm font-medium">
            Stripe Account ID
          </label>
          <Input
            id="accountId"
            placeholder="acct_1234567890abcdef"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loading}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Find this in your Stripe Dashboard under Settings → Account details
          </p>
        </div>

        <Button onClick={linkAccount} disabled={loading || !accountId.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Linking Account...
            </>
          ) : (
            <>
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Stripe Account
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Don't have a Stripe account?</span>
          </div>
        </div>

        <Button variant="outline" onClick={handleCreateAccount} className="w-full bg-transparent">
          <ExternalLink className="h-4 w-4 mr-2" />
          Create New Stripe Account
        </Button>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium text-sm">How to find your Account ID:</h4>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Log in to your Stripe Dashboard</li>
          <li>Go to Settings → Account details</li>
          <li>Copy your Account ID (starts with "acct_")</li>
          <li>Paste it in the field above</li>
        </ol>
      </div>
    </div>
  )
}

export default StripeAccountLinker
