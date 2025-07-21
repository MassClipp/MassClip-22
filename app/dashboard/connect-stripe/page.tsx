import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import the StripeAccountLinker to avoid SSR issues
const StripeAccountLinker = dynamic(() => import("@/components/stripe-account-linker"), {
  loading: () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Stripe connection...</span>
      </CardContent>
    </Card>
  ),
  ssr: false,
})

export default function ConnectStripePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
        <p className="text-gray-600">Start accepting payments and track your earnings</p>
      </div>

      <Suspense
        fallback={
          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading...</span>
            </CardContent>
          </Card>
        }
      >
        <StripeAccountLinker />
      </Suspense>
    </div>
  )
}
