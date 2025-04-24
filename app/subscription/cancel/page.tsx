"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default function SubscriptionCancelled() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <div className="relative z-10 max-w-md w-full p-8 bg-black rounded-lg shadow-lg border border-gray-800 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-900/20 p-3 mb-6">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">Subscription Cancelled</h1>

        <p className="text-gray-400 mb-6">
          Your subscription process was cancelled. If you encountered any issues or have questions, please don't
          hesitate to contact us.
        </p>

        <div className="space-y-4">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => router.push("/pricing")}>
            Try Again
          </Button>

          <Link href="/dashboard">
            <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
