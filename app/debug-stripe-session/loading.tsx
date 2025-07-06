import { Loader2 } from "lucide-react"

export default function DebugStripeSessionLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
        <p className="text-gray-400">Loading Stripe debugger...</p>
      </div>
    </div>
  )
}
