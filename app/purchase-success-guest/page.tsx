"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Mail, Lock, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function PurchaseSuccessGuestPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    // Extract email from URL params if available
    const sessionId = searchParams.get("session_id")
    if (sessionId) {
      // In a real implementation, you might fetch session details to get email
      // For now, we'll show a generic success message
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Purchase Successful!</h1>
            <p className="text-zinc-400">Thank you for your purchase. We've created an account for you.</p>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Mail className="h-4 w-4 text-blue-400" />
              <span>Check your email for login credentials</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Lock className="h-4 w-4 text-green-400" />
              <span>Your account has been automatically created</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              We've sent your login details to your email address. Use them to access your purchased content.
            </p>

            <Link href="/login">
              <Button className="w-full bg-white text-black hover:bg-zinc-200">
                Go to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Didn't receive an email? Check your spam folder or contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
