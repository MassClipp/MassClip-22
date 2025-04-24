"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function SubscriptionSuccess() {
  const { user } = useAuth()
  const router = useRouter()

  // If no user, redirect to login
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <div className="relative z-10 max-w-md w-full p-8 bg-black rounded-lg shadow-lg border border-gray-800 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-900/20 p-3 mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">Subscription Successful!</h1>

        <p className="text-gray-400 mb-6">
          Thank you for subscribing to MassClip Pro! Your account has been upgraded and you now have access to all
          premium features.
        </p>

        <div className="space-y-4">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>

          <Link href="/dashboard/user">
            <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
              View Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
