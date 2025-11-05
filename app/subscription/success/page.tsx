"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { getPlanDisplayName } from "@/lib/plan-config"

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [planName, setPlanName] = useState("")

  useEffect(() => {
    const sessionId = searchParams.get("session_id")

    async function fetchSession() {
      if (!sessionId) return

      try {
        const response = await fetch(`/api/stripe/session?session_id=${sessionId}`)
        const data = await response.json()

        // Get the plan from session metadata
        const plan = data.metadata?.plan || "starter"
        setPlanName(getPlanDisplayName(plan))
      } catch (error) {
        console.error("[v0] Error fetching session:", error)
        setPlanName("Faceless Pro")
      }
    }

    fetchSession()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-6">
            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Welcome to {planName || "Faceless Pro"}!</h1>
          <p className="text-lg text-muted-foreground">
            Your subscription is now active. Start creating and selling premium content!
          </p>
        </div>

        <Button size="lg" className="w-full" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
