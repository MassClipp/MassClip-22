"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LinkIcon, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function StripeAccountLinker() {
  const { toast } = useToast()
  const [accountId, setAccountId] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkAccount = async () => {
    if (!accountId.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch("/api/stripe/connect/link-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripeAccountId: accountId.trim() }),
    })
    const data = await res.json()

    if (data.success) {
      setSuccess(true)
      toast({ title: "Stripe account linked!" })
    } else {
      setError(data.error ?? "Unknown error")
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle className="h-12 w-12 text-green-400" />
        <span className="text-green-300 font-medium">Account linked successfully!</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Input
        placeholder="acct_1234567890"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        disabled={loading}
      />

      <Button onClick={linkAccount} disabled={loading || !accountId.trim()} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Linking…
          </>
        ) : (
          <>
            <LinkIcon className="h-4 w-4 mr-2" /> Link Account
          </>
        )}
      </Button>
    </div>
  )
}

/* also export as default for convenience */
export default StripeAccountLinker
