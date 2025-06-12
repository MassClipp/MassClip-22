"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Link, CheckCircle, ExternalLink, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface StripeAccountLinkerProps {
  onSuccess?: () => void
}

export function StripeAccountLinker({ onSuccess }: StripeAccountLinkerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [accountId, setAccountId] = useState("")
  const [loading, setLoading] = useState(false)
  const [linked, setLinked] = useState(false)

  const linkAccount = async () => {
    if (!user || !accountId.trim()) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stripeAccountId: accountId.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        setLinked(true)
        toast({
          title: "Success",
          description: "Stripe account linked successfully! Refreshing page...",
        })

        // Call onSuccess callback if provided
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500)
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to link account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to link Stripe account",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (linked) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-green-400 mb-2">Account Linked Successfully!</h3>
        <p className="text-sm text-green-300">Redirecting to earnings dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert className="border-green-600 bg-green-600/10">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-green-200">
          Enter your Stripe account ID (starts with "acct_"). Find it in your Stripe dashboard under Settings → Account
          details.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Input
          placeholder="acct_1234567890abcdef"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={loading}
          className="bg-zinc-800/50 border-zinc-700"
        />

        <Button
          onClick={linkAccount}
          disabled={loading || !accountId.trim()}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Linking Account...
            </>
          ) : (
            <>
              <Link className="h-4 w-4 mr-2" />
              Link Stripe Account
            </>
          )}
        </Button>
      </div>

      <div className="text-center">
        <Button
          variant="link"
          size="sm"
          onClick={() => window.open("https://dashboard.stripe.com/settings/account", "_blank")}
          className="text-green-400 hover:text-green-300"
        >
          Don't know your account ID? Find it here
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  )
}
