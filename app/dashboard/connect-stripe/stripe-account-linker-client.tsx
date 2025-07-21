"use client"

import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

/**
 * Dynamically load the StripeAccountLinker.
 * - ssr: false is **allowed here** because this file is a Client Component.
 */
const StripeAccountLinker = dynamic(() => import("@/components/stripe-account-linker"), {
  loading: () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Stripe connection…</span>
      </CardContent>
    </Card>
  ),
  ssr: false,
})

export default function StripeAccountLinkerClient() {
  return <StripeAccountLinker />
}
