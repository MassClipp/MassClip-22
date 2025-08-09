"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import useFirebaseAuth from "@/hooks/use-firebase-auth" // existing hook in this repo

const PAYMENT_LINK_BASE = "https://buy.stripe.com/aFa3cvbKsgRvexnfxdeIw05"

export default function MembershipPage() {
  const { user } = useFirebaseAuth() as {
    user: { uid: string; email?: string | null } | null
  }

  const href = React.useMemo(() => {
    const url = new URL(PAYMENT_LINK_BASE)
    // Pass the currently logged in user's UID so the webhook can tie the session to the user
    if (user?.uid) url.searchParams.set("client_reference_id", user.uid)
    // Optional: prefill email to reduce friction
    if (user?.email) url.searchParams.set("prefilled_email", user.email)
    return url.toString()
  }, [user?.uid, user?.email])

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership</CardTitle>
          <CardDescription>Upgrade to Creator Pro to unlock advanced features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Higher earnings (reduced platform fee)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Remove free-tier caps (bundles/videos limits)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Priority support</span>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Upgrade to Creator Pro via Stripe Payment Link"
            >
              <Button size="lg">Upgrade to Creator Pro</Button>
            </a>
            {!user?.uid && (
              <p className="text-sm text-muted-foreground">
                Tip: Log in first so we can attribute your upgrade to your account.
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            We append client_reference_id and prefilled_email to the Stripe link so the webhook can identify your
            account automatically.
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
