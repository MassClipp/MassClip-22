"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { getAuth } from "firebase/auth"
import { app } from "@/firebase/firebase" // assumes firebase is initialised here

interface ValidateResp {
  success: boolean
  account?: {
    id: string
    email: string | null
    country: string | null
    type: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    livemode: boolean
  }
  error?: string
}

export default function ManualStripeConnect() {
  const [accountId, setAccountId] = useState("")
  const [valid, setValid] = useState<ValidateResp["account"] | null>(null)
  const [loading, setLoading] = useState(false)

  async function validate() {
    setLoading(true)
    setValid(null)
    const res = await fetch("/api/stripe/connect/validate", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    })
    const data: ValidateResp = await res.json()
    setLoading(false)

    if (!data.success) return toast({ title: "Validation failed", description: data.error })

    setValid(data.account!)
  }

  async function connect() {
    if (!valid) return
    setLoading(true)
    const auth = getAuth(app)
    const idToken = await auth.currentUser?.getIdToken()
    const res = await fetch("/api/stripe/connect/manual", {
      method: "POST",
      body: JSON.stringify({ accountId: valid.id, idToken }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      toast({ title: "Connected!", description: `Account ${data.accountId} linked.` })
      setValid(null)
      setAccountId("")
    } else {
      toast({ title: "Connect failed", description: data.error })
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <h3 className="text-xl font-semibold">Manual Stripe Connect</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="acct">Stripe Account ID</Label>
          <Input id="acct" placeholder="acct_..." value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        </div>

        {valid && (
          <div className="rounded-md border p-3 text-sm">
            <p>
              <span className="font-semibold">Account:</span> {valid.id}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {valid.email ?? "—"}
            </p>
            <p>
              <span className="font-semibold">Charges&nbsp;Enabled:</span> {valid.chargesEnabled ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-semibold">Payouts&nbsp;Enabled:</span> {valid.payoutsEnabled ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-semibold">Mode:</span> {valid.livemode ? "Live" : "Test"}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Button variant="secondary" disabled={!accountId || loading} onClick={validate}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : "Validate"}
        </Button>
        <Button disabled={!valid || loading} onClick={connect}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : "Connect"}
        </Button>
      </CardFooter>
    </Card>
  )
}
